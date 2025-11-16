import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ---------- CONFIG ----------

SDSU_SCHOOL_ID = 877
# did=11 is Computer Science filter
SEARCH_URL = f"https://www.ratemyprofessors.com/search/professors/{SDSU_SCHOOL_ID}?q=*&&did=11"
BASE_URL = "https://www.ratemyprofessors.com"

REQ_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# Match cs210, CS 210, cs210(7), CS530CS570, etc.
COURSE_RE = re.compile(r"(?i)\bcs\s*([0-9]{2,3})")


# ---------- SELENIUM SETUP ----------

def make_driver(headless: bool = True):
    opts = Options()
    if headless:
        # for newer chromedriver
        opts.add_argument("--headless=new")
    opts.add_argument("--ignore-certificate-errors")
    opts.add_argument("--ignore-ssl-errors")
    opts.add_argument("--log-level=3")
    opts.add_argument("--start-maximized")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=opts)
    return driver


# ---------- HELPERS: COURSES FROM PROFESSOR PAGE ----------

def _collect_courses_from_text(text: str, out_set: set[str]):
    for m in COURSE_RE.finditer(text):
        out_set.add(m.group(1))


def _collect_courses_from_json(node, out_set: set[str]):
    """
    Recursively walk a JSON-like structure and collect any strings
    that contain CS course patterns.
    """
    if isinstance(node, dict):
        for v in node.values():
            _collect_courses_from_json(v, out_set)
    elif isinstance(node, list):
        for v in node:
            _collect_courses_from_json(v, out_set)
    elif isinstance(node, str):
        _collect_courses_from_text(node, out_set)


def scrape_prof_courses(prof: dict, delay: float = 0.3):
    """
    Fetch a professor page and extract CS course codes using:
      1) regex over raw HTML
      2) regex over all strings in the __NEXT_DATA__ JSON blob
    """
    try:
        resp = requests.get(prof["url"], headers=REQ_HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"    [WARN] error fetching {prof['url']}: {e}")
        prof["courses"] = []
        return

    html = resp.text
    soup = BeautifulSoup(html, "html.parser")

    codes: set[str] = set()

    # 1) scan whole HTML text
    _collect_courses_from_text(html, codes)

    # 2) try to parse embedded Next.js JSON and scan it too
    script = soup.find("script", id="__NEXT_DATA__")
    if script and script.string:
        try:
            data = json.loads(script.string)
            _collect_courses_from_json(data, codes)
        except Exception:
            pass  # ignore parse errors

    if codes:
        nums_sorted = sorted(codes, key=lambda x: int(x))
        prof["courses"] = [f"CS {n}" for n in nums_sorted]
    else:
        prof["courses"] = []

    print(f"    courses found: {prof['courses']}")
    time.sleep(delay)


# ---------- HELPERS: PROFESSOR LIST FROM SEARCH PAGE ----------

def parse_prof_card(a_tag) -> dict | None:
    """
    Parse a professor card <a> element from the search page.
    Skip professors with 0 ratings.
    """
    href = a_tag.get("href", "")
    if not href.startswith("/professor/"):
        return None

    url = BASE_URL + href
    text = a_tag.get_text(" ", strip=True)

    # overall quality
    quality = None
    m = re.search(r"QUALITY\s+([0-9.]+|N/A)", text)
    if m and m.group(1) != "N/A":
        quality = float(m.group(1))

    # number of ratings
    num_ratings = None
    m = re.search(r"\b(\d+)\s+ratings?\b", text)
    if m:
        num_ratings = int(m.group(1))

    # >>> skip instructors with no ratings
    if num_ratings in (None, 0):
        return None

    # would take again %
    wta = None
    m = re.search(r"(\d+)%\s+would take again", text)
    if m:
        wta = int(m.group(1))
    elif "N/A would take again" in text:
        wta = None

    # difficulty
    difficulty = None
    m = re.search(r"([0-9.]+|N/A)\s+level of difficulty", text)
    if m and m.group(1) != "N/A":
        difficulty = float(m.group(1))

    # name: strip header and tail, grab between "ratings" and "Computer Science"
    name = None
    try:
        t = re.sub(r"^QUALITY\s+[0-9.]+\s+", "", text).strip()
        t = re.sub(r"^\d+\s+ratings?\s+", "", t).strip()
        idx = t.index("Computer Science")
        name = t[:idx].strip()
    except ValueError:
        parts = text.split()
        name = " ".join(parts[4:7]) if len(parts) > 4 else None

    id_match = re.search(r"/professor/(\d+)", href)
    prof_id = id_match.group(1) if id_match else href

    return {
        "id": prof_id,
        "name": name,
        "url": url,
        "department": "Computer Science",
        "overall_quality": quality,
        "overall_difficulty": difficulty,
        "num_ratings": num_ratings,
        "would_take_again_percent": wta,
        "courses": [],
    }


def _collect_teacher_nodes(node, out_list: list[dict]):
    """
    Recursively walk a JSON tree and collect "teacher-like" dicts.
    Heuristic: objects that look like RMP teacher records.
    """
    if isinstance(node, dict):
        if (
            "legacyId" in node
            and "firstName" in node
            and "lastName" in node
            and "department" in node
        ):
            out_list.append(node)
        for v in node.values():
            _collect_teacher_nodes(v, out_list)
    elif isinstance(node, list):
        for v in node:
            _collect_teacher_nodes(v, out_list)


def fetch_cs_professors_via_json(soup, max_profs: int | None) -> list[dict]:
    """
    Try to read teacher list from embedded Next.js JSON.
    Returns [] if nothing usable is found.
    Skips professors with 0 ratings.
    """
    script = soup.find("script", id="__NEXT_DATA__")
    if not script or not script.string:
        # Try any script that contains teacher-like JSON
        for s in soup.find_all("script"):
            if not s.string:
                continue
            if '"legacyId"' in s.string and '"department"' in s.string:
                script = s
                break

    if not script or not script.string:
        return []

    try:
        data = json.loads(script.string)
    except Exception:
        return []

    teacher_nodes: list[dict] = []
    _collect_teacher_nodes(data, teacher_nodes)
    if not teacher_nodes:
        return []

    print(f"Found {len(teacher_nodes)} teacher nodes in JSON (before filtering).")

    professors: list[dict] = []
    seen_ids: set[int] = set()

    for node in teacher_nodes:
        dept = node.get("department")
        if dept != "Computer Science":
            continue

        # skip 0-rating instructors
        num_ratings = node.get("numRatings")
        if not num_ratings:  # None or 0
            continue

        legacy_id = node.get("legacyId") or node.get("id")
        if legacy_id is None:
            continue

        if legacy_id in seen_ids:
            continue
        seen_ids.add(legacy_id)

        first = (node.get("firstName") or "").strip()
        last = (node.get("lastName") or "").strip()
        name = (first + " " + last).strip() or None

        prof = {
            "id": str(legacy_id),
            "name": name,
            "url": f"{BASE_URL}/professor/{legacy_id}",
            "department": dept,
            "overall_quality": node.get("avgRating"),
            "overall_difficulty": node.get("avgDifficulty"),
            "num_ratings": num_ratings,
            "would_take_again_percent": node.get("wouldTakeAgainPercent"),
            "courses": [],
        }

        print(f"  discovered professor (JSON): {prof['name']} ({prof['id']})")
        professors.append(prof)

        if max_profs is not None and len(professors) >= max_profs:
            break

    return professors


def fetch_cs_professors_via_cards(driver, max_profs: int | None) -> list[dict]:
    """
    Fallback: scroll with 'Show More' and parse <a> cards.
    This is essentially your earlier working Selenium logic,
    but only to build the list (no course scraping here).
    parse_prof_card already skips 0-rating instructors.
    """
    professors: list[dict] = []
    seen_ids: set[str] = set()

    last_count = 0
    while True:
        soup = BeautifulSoup(driver.page_source, "html.parser")
        a_tags = soup.find_all("a", href=True)

        new_on_page = 0
        for a in a_tags:
            href = a.get("href", "")
            if not href.startswith("/professor/"):
                continue

            card = parse_prof_card(a)
            if not card:
                continue

            pid = card["id"]
            if pid in seen_ids:
                continue

            seen_ids.add(pid)
            professors.append(card)
            new_on_page += 1

            print(f"  discovered professor (cards): {card['name']} ({pid})")

            if max_profs is not None and len(professors) >= max_profs:
                return professors

        print(f"Found {new_on_page} new professors on this page (total {len(professors)})")

        if len(professors) == last_count:
            print("Professor count did not increase; stopping pagination.")
            break
        last_count = len(professors)

        try:
            show_more = driver.find_element(By.XPATH, "//button[contains(., 'Show More')]")
        except NoSuchElementException:
            print("No 'Show More' button found; assuming end of results.")
            break

        if not show_more.is_enabled() or not show_more.is_displayed():
            print("'Show More' button not enabled/displayed; assuming end of results.")
            break

        print("Clicking 'Show More'...")
        driver.execute_script("arguments[0].click();", show_more)
        time.sleep(2.0)

    return professors


def fetch_cs_professors_from_search(driver, max_profs: int | None = None) -> list[dict]:
    """
    Use Selenium to load the SDSU CS search page, then:
      1) Try JSON (__NEXT_DATA__ or similar) to get teacher list.
      2) If that fails, fall back to scrolling + parsing cards.
    """
    print(f"Loading RMP CS search page: {SEARCH_URL}")
    driver.get(SEARCH_URL)

    # give the page a moment to render
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
    except Exception:
        time.sleep(3)

    soup = BeautifulSoup(driver.page_source, "html.parser")

    # 1) try JSON-based extraction
    professors = fetch_cs_professors_via_json(soup, max_profs=max_profs)
    if professors:
        print(f"Kept {len(professors)} CS professors via JSON.")
        return professors

    print("[WARN] Could not extract teacher list from JSON; "
          "falling back to scrolling + parsing cards.")

    # 2) fallback: scroll + parse cards
    professors = fetch_cs_professors_via_cards(driver, max_profs=max_profs)
    print(f"Kept {len(professors)} CS professors via cards.")
    return professors


# ---------- MAIN SCRAPER ----------

def scrape_sdsu_cs(max_profs: int | None = None) -> list[dict]:
    """
    Top-level:
      1) Use Selenium to load the SDSU CS search page and build the CS professor list.
      2) For each professor, scrape their courses via requests + JSON/regex.
    """
    driver = make_driver(headless=True)
    try:
        professors = fetch_cs_professors_from_search(driver, max_profs=max_profs)
    finally:
        driver.quit()

    print("\nScraping courses for each professor...")
    total = len(professors)
    for i, prof in enumerate(professors, start=1):
        print(f"  [{i}/{total}] {prof['name']} ({prof['id']})")
        scrape_prof_courses(prof)

    return professors


# ---------- ENTRY POINT ----------

if __name__ == "__main__":
    # For debugging: small number like 10.
    # For full department: set to None or 113.
    MAX_PROFS = 115

    profs = scrape_sdsu_cs(max_profs=MAX_PROFS)

    out_dir = Path(__file__).resolve().parent / "scraped_files"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "sdsu_cs_professors.json"

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(profs, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(profs)} professors to {out_path}")
