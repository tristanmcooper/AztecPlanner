"""Lightweight Course DB backed by a JSON file.

This provides a small, ergonomic API inspired by the project's chroma wrapper:

- CourseDB(json_path=None) - load courses from JSON (default: utils/data/sdsu_cs_courses.json)
- get(code) -> dict | None - retrieve a course by its code (case-insensitive, trims whitespace)
- get_all() -> list[dict] - all courses in original order
- query_codes(prefix) -> list[dict] - retrieve courses whose code starts with the prefix
- reload() - reload from disk

The implementation uses an in-memory hashmap keyed by a normalized course code
for O(1) lookups. It's intentionally tiny and dependency-free.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional


DEFAULT_JSON = Path(__file__).resolve().parent / "data" / "sdsu_cs_courses.json"


class CourseDB:
    """Simple in-memory course database.

    The class loads course data from a JSON file and builds a lookup map by the
    `code` field. Lookups are case-insensitive and tolerant to extra whitespace.
    """

    def __init__(self, json_path: Optional[Path | str] = None, load_on_init: bool = True):
        self.json_path = Path(json_path) if json_path else DEFAULT_JSON
        self._courses: List[Dict] = []
        self._by_code: Dict[str, Dict] = {}
        if load_on_init:
            self.load()

    # --- utility / normalization ---
    @staticmethod
    def _normalize_code(code: str) -> str:
        if code is None:
            return ""
        return code.strip().upper()

    # --- loading / persistence ---
    def load(self) -> None:
        """Load courses from the configured JSON file and rebuild the index."""
        if not self.json_path.exists():
            # empty DB if file missing
            self._courses = []
            self._by_code = {}
            return

        with self.json_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)

        if not isinstance(data, list):
            raise ValueError(f"Expected a list of course objects in {self.json_path}")

        self._courses = data
        self._by_code = {}
        for course in self._courses:
            code = course.get("code")
            if code:
                self._by_code[self._normalize_code(code)] = course

    def reload(self) -> None:
        """Alias for load() to match familiar naming patterns."""
        self.load()

    # --- accessors ---
    def get(self, code: str, default: Optional[dict] = None) -> Optional[dict]:
        """Return the course dict for `code` or `default` if not found.

        Lookup is case-insensitive and tolerates extra whitespace.
        """
        if code is None:
            return default
        return self._by_code.get(self._normalize_code(code), default)

    def get_all(self) -> List[Dict]:
        """Return the list of all courses in the original order."""
        return list(self._courses)

    def query_codes(self, prefix: str) -> List[Dict]:
        """Return courses whose `code` starts with the given prefix (case-insensitive).

        Example: query_codes('CS 2') -> courses with codes like 'CS 210', 'CS 240', ...
        """
        if not prefix:
            return self.get_all()
        np = self._normalize_code(prefix)
        results: List[Dict] = []
        for code, course in self._by_code.items():
            if code.startswith(np):
                results.append(course)
        # preserve sort by code for stability
        results.sort(key=lambda c: self._normalize_code(c.get("code", "")))
        return results

    def search(self, term: str) -> List[Dict]:
        """Basic substring search across `code` and `name` (case-insensitive).

        This is intentionally simple (no NLP). Returns courses matching the term.
        """
        if not term:
            return []
        term_low = term.strip().lower()
        out: List[Dict] = []
        for c in self._courses:
            code = (c.get("code") or "").lower()
            name = (c.get("name") or "").lower()
            if term_low in code or term_low in name:
                out.append(c)
        return out


def simple_demo():
    """Small helper to exercise the DB when run as a script."""
    db = CourseDB()
    print(f"Loaded {len(db.get_all())} courses from {db.json_path}")
    sample = ["CS 210", "cs 450", "CS 999"]
    for s in sample:
        print(s, "->", db.get(s))


if __name__ == "__main__":
    simple_demo()
