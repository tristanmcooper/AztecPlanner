import requests
from bs4 import BeautifulSoup
import urllib.parse

BASE = "https://catalog.sdsu.edu/content.php?catoid=9&navoid=786"

def extract_course_links_from_page(url: str):
    """
    Return a list of dicts with the course code text on the page
    and the corresponding preview_course_nopop URL.
    Works for American Institutions, Language Requirement, GE pages, etc.
    """
    resp = requests.get(url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    courses = []

    # any <a> element whose href points at a course preview
    for a in soup.select("a[href*='preview_course_nopop.php'], a[href*='preview_course.php']"):
        code_text = a.get_text(" ", strip=True)
        if not code_text:
            continue

        href = a.get("href")
        full_url = urllib.parse.urljoin(BASE, href)

        courses.append(
            {
                "code_label": code_text,      # e.g. "AFRAS 170A" or "SPAN 101"
                "detail_url": full_url,       # preview_course_nopop link
            }
        )

    return courses

GE_URL = "https://catalog.sdsu.edu/content.php?catoid=9&navoid=786"  # or the actual GE page URL
ge_courses = extract_course_links_from_page(GE_URL)

print(len(ge_courses))
for c in ge_courses:
    print(c)


def extract_ge_courses_with_areas(url: str):
    resp = requests.get(url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    current_area = None
    results = []

    # iterate over all tags in document order
    for tag in soup.body.descendants:
        if tag.name in ("h2", "h3", "strong"):
            heading_text = tag.get_text(" ", strip=True)
            if heading_text:
                current_area = heading_text

        if getattr(tag, "name", None) == "a" and tag.has_attr("href"):
            href = tag["href"]
            if "preview_course" not in href:
                continue

            code_text = tag.get_text(" ", strip=True)
            if not code_text:
                continue

            full_url = urllib.parse.urljoin(BASE, href)
            results.append(
                {
                    "area": current_area,      # e.g. "American Institutions Requirement"
                    "code_label": code_text,
                    "detail_url": full_url,
                }
            )

    return results
