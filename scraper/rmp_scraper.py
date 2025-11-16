# import json
# import re
# import time
# from pathlib import Path

# import requests
# from bs4 import BeautifulSoup

# BASE_URL = "https://www.ratemyprofessors.com"

# # This is the normal CS search URL you already use – still useful as a fallback
# SEARCH_URL = "https://www.ratemyprofessors.com/search/professors/877?q=*&&did=11"

# HEADERS = {
#     "User-Agent": (
#         "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
#         "AppleWebKit/537.36 (KHTML, like Gecko) "
#         "Chrome/122.0.0.0 Safari/537.36"
#     ),
#     "Accept-Language": "en-US,en;q=0.9",
# }

# # We will also look for a locally saved HTML copy of the fully expanded CS page.
# # Put it here after you click "Show More" until all 114 professors are visible:
# #   scraper/scraped_files/rmp_sdsu_cs_search.html
# LOCAL_SEARCH_HTML = (
#     Path(__file__).resolve().parent / "scraped_files" / "rmp_sdsu_cs_search.html"
# )

# # anchors to professor pages look like /professor/2893834
# prof_link_re = re.compile(r"^/professor/\d+$")


# def get_soup_from_url(url: str) -> BeautifulSoup:
#     resp = requests.get(url, headers=HEADERS, timeout=15)
#     resp.raise_for_status()
#     return BeautifulSoup(resp.text, "html.parser")


# def get_soup_for_search_page() -> BeautifulSoup:
#     """
#     Prefer a locally saved copy of the CS search page if it exists.
#     Otherwise, fetch the live page (which will only have the first N profs).
#     """
#     if LOCAL_SEARCH_HTML.exists():
#         print(f"Using local search HTML: {LOCAL_SEARCH_HTML}")
#         html = LOCAL_SEARCH_HTML.read_text(encoding="utf-8", errors="ignore")
#         return BeautifulSoup(html, "html.parser")

#     print(f"Fetching live search page: {SEARCH_URL}")
#     return get_soup_from_url(SEARCH_URL)


# def parse_prof_card(a_tag) -> dict:
#     """
#     Parse a professor card element from the search page.
#     Returns a dict without courses yet.
#     """
#     href = a_tag["href"]
#     url = BASE_URL + href
#     text = a_tag.get_text(" ", strip=True)

#     # overall quality
#     quality = None
#     m = re.search(r"QUALITY\s+([0-9.]+|N/A)", text, flags=re.IGNORECASE)
#     if m and m.group(1) != "N/A":
#         quality = float(m.group(1))

#     # number of ratings
#     num_ratings = None
#     m = re.search(r"(\d+)\s+ratings?", text, flags=re.IGNORECASE)
#     if m:
#         num_ratings = int(m.group(1))

#     # would take again %
#     wta = None
#     m = re.search(r"(\d+)%\s+would take again", text, flags=re.IGNORECASE)
#     if m:
#         wta = int(m.group(1))

#     # difficulty
#     difficulty = None
#     m = re.search(r"([0-9.]+|N/A)\s+level of difficulty", text, flags=re.IGNORECASE)
#     if m and m.group(1) != "N/A":
#         difficulty = float(m.group(1))

#     # ---- NAME EXTRACTION ----
#     # The first /professor/... link on the card often has no visible name,
#     # so a_tag.find("span") can be empty. Instead, pull the name from the text.
#     #
#     # Typical text shape:
#     # "QUALITY 4.3 47 ratings 81% would take again 4.0 level of difficulty
#     #  Ben Shen Computer Science San Diego State University"
#     #
#     # So, grab whatever sits between "...level of difficulty" and
#     # "Computer Science".
#     name = None
#     m = re.search(
#         r"level of difficulty\s+(.+?)\s+Computer Science",
#         text,
#         flags=re.IGNORECASE,
#     )
#     if m:
#         name = m.group(1).strip()
#     else:
#         # fallback: if the department string ever changes, try a looser pattern
#         # (take the first chunk after "level of difficulty")
#         m2 = re.search(r"level of difficulty\s+(.+)", text, flags=re.IGNORECASE)
#         if m2:
#             # this may be "Ben Shen Computer Science San Diego State University"
#             candidate = m2.group(1).strip()
#             # just take first 2 words as a rough fallback
#             parts = candidate.split()
#             if len(parts) >= 2:
#                 name = " ".join(parts[:2])

#     # prof id from /professor/123456
#     id_match = re.search(r"/professor/(\d+)", href)
#     prof_id = id_match.group(1) if id_match else href

#     return {
#         "id": prof_id,
#         "name": name,
#         "url": url,
#         "department": "Computer Science",  # all cards are CS in this search
#         "overall_quality": quality,
#         "overall_difficulty": difficulty,
#         "num_ratings": num_ratings,
#         "would_take_again_percent": wta,
#         "courses": [],  # filled later
#     }


# def scrape_prof_courses(prof: dict):
#     """
#     Go to a professor's page and extract CS course codes they are
#     mentioned with (e.g., 'CS 210', 'CS 576').
#     """
#     soup = get_soup_from_url(prof["url"])
#     text = soup.get_text(" ", strip=True)

#     # allow both "CS 420" and "CS420"
#     courses = sorted(set(re.findall(r"\bCS\s*?\d{2,3}\b", text)))
#     prof["courses"] = courses


# def scrape_sdsu_cs(max_profs=None, delay=0.6):
#     """
#     Scrape CS professors at SDSU from RMP using:
#       - a fully expanded saved HTML search page, if present, OR
#       - the live search page (only first chunk of profs).

#     max_profs: optional cap on professor count.
#     delay: seconds to sleep between professor-page requests.
#     """
#     soup = get_soup_for_search_page()

#     # collect all /professor/xxxxx links on the page
#     a_tags = [
#         a for a in soup.find_all("a", href=True)
#         if prof_link_re.match(a["href"])
#     ]

#     if not a_tags:
#         print("No professor links found on search page.")
#         return []

#     professors = []
#     seen_ids = set()

#     for a in a_tags:
#         prof = parse_prof_card(a)
#         if prof["id"] in seen_ids:
#             continue

#         seen_ids.add(prof["id"])
#         idx = len(professors) + 1
#         print(f"  scraping prof {idx}: {prof['name']} ({prof['id']})")

#         try:
#             scrape_prof_courses(prof)
#         except Exception as e:
#             print(f"    error scraping courses for {prof['name']}: {e}")

#         professors.append(prof)

#         if max_profs is not None and len(professors) >= max_profs:
#             break

#         time.sleep(delay)

#     return professors


# if __name__ == "__main__":
#     # For a full run once you’ve saved the expanded HTML, set max_profs=None.
#     # For quick tests while iterating, use something like max_profs=5.
#     profs = scrape_sdsu_cs(max_profs=None)

#     out_dir = Path(__file__).resolve().parent / "scraped_files"
#     out_dir.mkdir(parents=True, exist_ok=True)
#     out_path = out_dir / "sdsu_cs_professors.json"

#     with out_path.open("w", encoding="utf-8") as f:
#         json.dump(profs, f, indent=2, ensure_ascii=False)

#     print(f"Wrote {len(profs)} professors to {out_path}")
import json
import os
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException

# ---------- CONFIG ----------

SDSU_SCHOOL_ID = 877
# did=11 is Computer Science filter
SEARCH_URL = f"https://www.ratemyprofessors.com/search/professors/{SDSU_SCHOOL_ID}?q=*&&did=11"
BASE_URL = "https://www.ratemyprofessors.com"

# Requests headers for professor detail pages
REQ_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# ---------- SELENIUM SETUP ----------

def make_driver(headless: bool = True):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--ignore-certificate-errors")
    opts.add_argument("--ignore-ssl-errors")
    opts.add_argument("--log-level=3")
    opts.add_argument("--start-maximized")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=opts)
    return driver

# ---------- PARSING HELPERS ----------

def parse_prof_card(a_tag) -> dict:
    """
    Parse a professor card <a> element from the search page.

    We only have the flattened text, e.g.:
      "QUALITY 3.2 10 ratings Magda Tsintsadze Computer Science
       San Diego State University 50% would take again 4.1 level of difficulty"
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
    # We know everything on this page is CS, so use that as an anchor.
    name = None
    try:
        # Remove "QUALITY <num>" prefix if present
        t = re.sub(r"^QUALITY\s+[0-9.]+\s+", "", text).strip()
        # Remove leading "<num> ratings"
        t = re.sub(r"^\d+\s+ratings?\s+", "", t).strip()
        # Now t should be "<Name> Computer Science San Diego State University ..."
        idx = t.index("Computer Science")
        name = t[:idx].strip()
    except ValueError:
        # Fallback: just pick a middle chunk as name if anything goes wrong
        parts = text.split()
        if len(parts) > 4:
            name = " ".join(parts[4:7])
        else:
            name = None

    # prof id from /professor/123456
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
        "courses": [],  # filled later
    }

def scrape_prof_courses(prof: dict, delay: float = 0.5):
    """
    Go to a professor's page (via requests) and extract CS course codes they are
    mentioned with (e.g., 'CS 210', 'CS 576').
    """
    try:
        resp = requests.get(prof["url"], headers=REQ_HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"    [WARN] error fetching {prof['url']}: {e}")
        prof["courses"] = []
        return

    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(" ", strip=True)

    # Grab unique 'CS ###' tokens from the page (allow optional space, store normalized with space)
    raw_courses = set(re.findall(r"\b[Cc][Ss]\s*([0-9]{2,3})\b", text))
    courses = [f"CS {num}" for num in sorted(raw_courses, key=lambda x: int(x))]

    prof["courses"] = courses
    time.sleep(delay)

# ---------- MAIN SCRAPER USING SELENIUM + BS4 ----------

def scrape_sdsu_cs(max_profs: int | None = None, click_delay: float = 2.0) -> list[dict]:
    """
    Scrape all CS professors at SDSU from RMP.

    Uses Selenium to:
      - Load the CS-filtered search page.
      - Click "Show More" until exhausted or max_profs reached.

    Uses BeautifulSoup on driver.page_source to parse professor cards.
    """
    driver = make_driver(headless=True)
    professors: list[dict] = []
    seen_ids: set[str] = set()

    print(f"Loading RMP CS search page: {SEARCH_URL}")
    driver.get(SEARCH_URL)

    try:
        # Basic sanity wait: ensure at least one professor link is present
        # (we don't use WebDriverWait here to keep it simple; just loop a few times)
        got_one = False
        for _ in range(10):
            soup = BeautifulSoup(driver.page_source, "html.parser")
            a_tags = soup.find_all("a", href=True)
            if any(a.get("href", "").startswith("/professor/") for a in a_tags):
                got_one = True
                break
            time.sleep(1.0)

        if not got_one:
            print("No professor cards found on initial load. Aborting.")
            driver.quit()
            return []

        while True:
            soup = BeautifulSoup(driver.page_source, "html.parser")
            a_tags = soup.find_all("a", href=True)

            new_on_this_page = 0

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
                new_on_this_page += 1
                idx = len(professors) + 1
                print(f"  scraping professor {idx}: {card['name']} ({pid})")

                # scrape their courses
                scrape_prof_courses(card)

                professors.append(card)

                if max_profs is not None and len(professors) >= max_profs:
                    print(f"Reached max_profs={max_profs}; stopping.")
                    driver.quit()
                    return professors

            print(f"Found {new_on_this_page} new professors on this page (total so far: {len(professors)})")

            # Try to click "Show More" if it exists; otherwise stop
            try:
                show_more = driver.find_element(
                    By.XPATH,
                    "//button[contains(., 'Show More')]"
                )
            except NoSuchElementException:
                print("No 'Show More' button found; assuming end of results.")
                break

            if not show_more.is_enabled() or not show_more.is_displayed():
                print("'Show More' button not enabled/displayed; assuming end of results.")
                break

            print("Clicking 'Show More'...")
            driver.execute_script("arguments[0].click();", show_more)
            time.sleep(click_delay)

    finally:
        driver.quit()

    return professors

# ---------- ENTRY POINT ----------

if __name__ == "__main__":
    # Smoke test: cap to first N professors so you can see prints quickly.
    MAX_PROFS = 10  # change to None or 114 when you're happy

    profs = scrape_sdsu_cs(max_profs=MAX_PROFS)

    out_dir = Path(__file__).resolve().parent / "scraped_files"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "sdsu_cs_professors.json"

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(profs, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(profs)} professors to {out_path}")
