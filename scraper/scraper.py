import requests
from bs4 import BeautifulSoup
import urllib.parse
import json
import time
import re

BASE = "https://catalog.sdsu.edu"
CS_URL = (
    "https://catalog.sdsu.edu/content.php?"
    "filter%5B27%5D=-1&filter%5B29%5D=&filter%5Bcourse_type%5D=1411&"
    "filter%5Bkeyword%5D=&filter%5B32%5D=1&filter%5Bcpage%5D=1&"
    "cur_cat_oid=11&expand=&navoid=992&search_database=Filter&"
    "filter%5Bexact_match%5D=1#acalog_template_course_filter"
)

resp = requests.get(CS_URL)
resp.raise_for_status()
soup = BeautifulSoup(resp.text, "html.parser")

course_links = []

for a in soup.find_all("a"):
    text = a.get_text(strip=True)
    href = a.get("href")
    if not href or "preview_course_nopop.php" not in href:
        continue
    if not text.startswith("CS "):
        continue

    course_links.append(
        {
            "listing_text": text,
            "detail_url": urllib.parse.urljoin(BASE, href),
        }
    )

print("Found", len(course_links), "course links")


def parse_listing_text(text: str):
    parts = text.split()
    if len(parts) < 2:
        return text.strip(), ""
    code = " ".join(parts[:2])
    name = " ".join(parts[2:]).lstrip("-").strip()
    return code, name


def clean_str(s: str | None) -> str | None:
    if not s:
        return s
    # normalize spaces and curly apostrophes
    s = s.replace("\xa0", " ")
    s = s.replace("’", "'")
    return s.strip()


def scrape_course_detail(url: str) -> dict:
    resp = requests.get(url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    full_text = soup.get_text(" ", strip=True)
    full_text = full_text.replace("\xa0", " ").replace("’", "'")

    units = None
    m = re.search(r"Units:\s*([0-9]+(?:-[0-9]+)?)", full_text)
    if m:
        units = m.group(1)

    ge = None
    m = re.search(
        r"General Education:\s*(.+?)(?:Grading Method:|Prerequisite\(s\):|May Be Repeated:|Maximum Credits:|Typically Offered:|Back to Top|Note:|$)",
        full_text,
    )
    if m:
        ge = m.group(1).strip()

    grading_method = None
    gm_match = re.search(
        r"Grading Method:\s*(.+?)(?:Prerequisite\(s\):|May Be Repeated:|Maximum Credits:|Typically Offered:|Back to Top|Note:|$)",
        full_text,
    )
    if gm_match:
        grading_method = gm_match.group(1).strip()

    max_credits = None
    m = re.search(r"Maximum Credits:\s*([0-9]+)", full_text)
    if m:
        max_credits = m.group(1)

    typically_offered = None
    m = re.search(r"Typically Offered:\s*([A-Za-z/ ]+)", full_text)
    if m:
        typ = m.group(1)
        typ = typ.split("Back to Top")[0].strip()
        if typ:
            typically_offered = typ

    notes = None
    m = re.search(r"Note:\s*(.+?)(?:Back to Top|$)", full_text)
    if m:
        notes = m.group(1).strip()
        # strip any stray "Typically Offered: ..." that leaked into Note:
        notes = re.sub(
            r"Typically Offered:\s*[A-Za-z/ ]+$", "", notes
        ).strip()

    prereqs = None
    description = None
    restrictions = None

    def cut_at_label(text: str) -> str:
        labels = [
            "May Be Repeated:",
            "Maximum Credits:",
            "Typically Offered:",
            "Back to Top",
            "Note:",
        ]
        end = len(text)
        for lab in labels:
            idx = text.find(lab)
            if idx != -1 and idx < end:
                end = idx
        return text[:end].strip()

    pre_block = re.search(
        r"Prerequisite\(s\):\s*(.+?)(?:May Be Repeated:|Maximum Credits:|Typically Offered:|Back to Top|Note:|$)",
        full_text,
    )
    if pre_block:
        pre_text = cut_at_label(pre_block.group(1).strip())
        sentences = re.split(r"\.\s*", pre_text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if sentences:
            prereqs = sentences[0]
            other = sentences[1:]

            policy_sentences = [s for s in other if s.startswith("Not open")]
            desc_sentences = [s for s in other if not s.startswith("Not open")]

            if policy_sentences:
                unique_policies = []
                seen = set()
                for s in policy_sentences:
                    canon = re.sub(r"[.\s]+$", "", s.strip())
                    if canon not in seen:
                        seen.add(canon)
                        unique_policies.append(canon)
                if unique_policies:
                    restrictions = ". ".join(unique_policies) + "."

            if desc_sentences:
                description = ". ".join(desc_sentences).strip()
    else:
        gm_sentence = re.search(r"Grading Method:.*?\.", full_text)
        if gm_sentence:
            after = full_text[gm_sentence.end():].strip()
            desc_candidate = cut_at_label(after)
            if desc_candidate:
                description = desc_candidate

    # final cleanup for each text field
    units_clean = clean_str(units)
    ge = clean_str(ge)
    grading_method = clean_str(grading_method)
    prereqs = clean_str(prereqs)
    restrictions = clean_str(restrictions)
    description = clean_str(description)
    max_credits = clean_str(max_credits)
    typically_offered = clean_str(typically_offered)
    notes = clean_str(notes)

    return {
        "units": units_clean,
        "general_education": ge,
        "grading_method": grading_method,
        "prereqs": prereqs,
        "restrictions": restrictions,
        "description": description,
        "max_credits": max_credits,
        "typically_offered": typically_offered,
        "notes": notes,
    }


courses = []

for link in course_links:
    code, name = parse_listing_text(link["listing_text"])

    m = re.search(r"\d+", code)
    if not m:
        continue
    num = int(m.group())
    if num >= 600:
        continue

    detail_url = link["detail_url"]

    try:
        details = scrape_course_detail(detail_url)
    except Exception as e:
        print(f"Error scraping {code} at {detail_url}: {e}")
        continue

    # Manual fixes for the two weird experimental-topics pages
    if code in ("CS 296", "CS 496"):
        gm = details.get("grading_method") or ""
        gm = gm.replace(" Selected topics.", "").strip()
        details["grading_method"] = gm
        details["description"] = "Selected topics."

    course = {
        "code": code,
        "name": name,
        "detail_url": detail_url,
        **details,
    }
    courses.append(course)
    time.sleep(0.3)

from pathlib import Path

# Directory where this script lives: .../AztecPlanner/scraper
SCRIPT_DIR = Path(__file__).resolve().parent

# Where you want all scraped JSON files to go
SCRAPED_DIR = SCRIPT_DIR / "scraped_files"
SCRAPED_DIR.mkdir(parents=True, exist_ok=True)

# If you want to generalize by subject, parameterize this:
subject = "cs"  # later you can change this dynamically
out_path = SCRAPED_DIR / f"sdsu_{subject}_courses.json"

with out_path.open("w", encoding="utf-8") as f:
    json.dump(courses, f, indent=2, ensure_ascii=False)

print(f"Scraped {len(courses)} courses and wrote to {out_path}")
with open("scraper/scraped_files/sdsu_cs_courses.json", "w") as f:
    json.dump(courses, f, indent=2, ensure_ascii=False)


print(f"Scraped {len(courses)} undergrad courses and wrote to sdsu_cs_courses.json")
