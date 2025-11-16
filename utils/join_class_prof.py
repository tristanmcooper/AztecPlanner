import json
from pathlib import Path
from typing import Any, Dict, List

# ---------- PATHS RESOLVED FROM REPO ROOT ----------

# join_class_prof.py lives in: <repo_root>/utils/join_class_prof.py
# so repo_root is one level up from this file.
REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "scraper" / "scraped_files"

COURSES_PATH = DATA_DIR / "sdsu_cs_courses.json"
PROFS_PATH = DATA_DIR / "sdsu_cs_professors.json"

COURSES_WITH_PROFS_PATH = DATA_DIR / "sdsu_cs_courses_with_professors.json"
PROFS_LLM_PATH = DATA_DIR / "sdsu_cs_professors_llm.json"


def load_json(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(f"Expected file not found: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize_course_code(code: str) -> str:
    """
    Normalize course code to a canonical form like 'CS 150'.
    Accepts 'cs150', 'CS150', 'cs 150', etc.
    """
    code = code.strip()
    # quick guard
    if not code:
        return code

    # Uppercase and ensure there is exactly one space between prefix and number
    # e.g., 'cs150' -> 'CS 150', 'cs 150' -> 'CS 150'
    import re

    m = re.match(r"(?i)\s*cs\s*([0-9]{2,3})\s*$", code)
    if m:
        return f"CS {m.group(1)}"

    # If it already looks like 'CS 150', leave it
    return code.upper()


def build_course_to_profs(
    profs: List[Dict[str, Any]]
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Build mapping: normalized course code -> list of professor summary dicts.
    """
    course_to_profs: Dict[str, List[Dict[str, Any]]] = {}

    for p in profs:
        # skip professors with no ratings if you want
        if not p.get("num_ratings"):
            continue

        base_prof_info = {
            "id": p.get("id"),
            "name": p.get("name"),
            "url": p.get("url"),
            "overall_quality": p.get("overall_quality"),
            "overall_difficulty": p.get("overall_difficulty"),
            "num_ratings": p.get("num_ratings"),
            "would_take_again_percent": p.get("would_take_again_percent"),
        }

        for raw_code in p.get("courses", []):
            norm = normalize_course_code(raw_code)
            if not norm:
                continue
            course_to_profs.setdefault(norm, []).append(base_prof_info)

    return course_to_profs


def attach_professors_to_courses(
    courses: List[Dict[str, Any]],
    course_to_profs: Dict[str, List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """
    For each course in the catalog JSON, add a 'professors' field
    listing professor summaries.
    """
    out: List[Dict[str, Any]] = []

    for c in courses:
        code = c.get("code", "")
        norm = normalize_course_code(code)

        # shallow copy to avoid mutating original structure
        c_copy = dict(c)
        c_copy["professors"] = course_to_profs.get(norm, [])
        out.append(c_copy)

    return out


def build_llm_professor_records(
    profs: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Build a list of professor records optimized for embedding / LLM use.
    Adds a 'text' field with a compact description.
    """
    llm_records: List[Dict[str, Any]] = []

    for p in profs:
        # You said you want to ignore no-review profs:
        if not p.get("num_ratings"):
            continue

        name = p.get("name") or "Unknown professor"
        dept = p.get("department") or "Computer Science"
        overall = p.get("overall_quality")
        diff = p.get("overall_difficulty")
        num_r = p.get("num_ratings")
        wta = p.get("would_take_again_percent")
        courses = p.get("courses") or []

        overall_str = f"{overall:.1f}" if isinstance(overall, (int, float)) else "N/A"
        diff_str = f"{diff:.1f}" if isinstance(diff, (int, float)) else "N/A"
        wta_str = f"{wta}%" if isinstance(wta, (int, float)) else "N/A"

        courses_str = ", ".join(courses) if courses else "no listed courses"

        text = (
            f"{name} is a professor in the {dept} department at San Diego State University. "
            f"They have an overall quality rating of {overall_str} out of 5 and a difficulty rating of {diff_str}."
            f" They have {num_r or 0} ratings and {wta_str} of students would take them again. "
            f"They are associated with the following courses: {courses_str}."
        )

        record = dict(p)
        record["text"] = text

        llm_records.append(record)

    return llm_records


def main():
    print(f"Using data directory: {DATA_DIR}")
    print(f"  Courses file: {COURSES_PATH}")
    print(f"  Professors file: {PROFS_PATH}")

    courses = load_json(COURSES_PATH)
    profs = load_json(PROFS_PATH)

    course_to_profs = build_course_to_profs(profs)
    courses_with_profs = attach_professors_to_courses(courses, course_to_profs)
    profs_llm = build_llm_professor_records(profs)

    with COURSES_WITH_PROFS_PATH.open("w", encoding="utf-8") as f:
        json.dump(courses_with_profs, f, indent=2, ensure_ascii=False)

    with PROFS_LLM_PATH.open("w", encoding="utf-8") as f:
        json.dump(profs_llm, f, indent=2, ensure_ascii=False)

    print(f"\nWrote {len(courses_with_profs)} courses to {COURSES_WITH_PROFS_PATH}")
    print(f"Wrote {len(profs_llm)} professor LLM records to {PROFS_LLM_PATH}")


if __name__ == "__main__":
    main()
