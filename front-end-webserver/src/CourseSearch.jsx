// front-end-webserver/src/CourseSearch.jsx
import React, { useState } from "react";
import profExtra from "./assets/sdsu_cs_professors.json";

// Build a quick lookup table for extra professor info
const extraProfById = new Map(
  (profExtra || []).map((p) => [String(p.id), p])
);

function summarizeProfessors(professors = []) {
  if (!professors.length) return "No RMP data";

  const total = professors.reduce(
    (acc, p) =>
      acc +
      (typeof p.overall_quality === "number"
        ? p.overall_quality
        : parseFloat(p.overall_quality) || 0),
    0
  );
  const countWithRating = professors.filter(
    (p) =>
      typeof p.overall_quality === "number" ||
      !Number.isNaN(parseFloat(p.overall_quality))
  ).length;

  const avg = countWithRating ? (total / countWithRating).toFixed(1) : null;
  const best = professors
    .filter(
      (p) =>
        typeof p.overall_quality === "number" ||
        !Number.isNaN(parseFloat(p.overall_quality))
    )
    .sort(
      (a, b) =>
        (parseFloat(b.overall_quality) || 0) -
        (parseFloat(a.overall_quality) || 0)
    )[0];

  if (!avg) return `${professors.length} professor(s) on RMP`;
  if (best) {
    return `${professors.length} profs · avg ${avg}/5 · top: ${
      best.name
    } (${parseFloat(best.overall_quality).toFixed(1)}/5)`;
  }
  return `${professors.length} profs · avg ${avg}/5`;
}

function summarizeDifficulty(professors = []) {
  const diffs = professors
    .map((p) =>
      typeof p.overall_difficulty === "number"
        ? p.overall_difficulty
        : parseFloat(p.overall_difficulty)
    )
    .filter((x) => !Number.isNaN(x));

  if (!diffs.length) return null;
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return { avg: avg.toFixed(1), count: diffs.length };
}

function ratingBadgeClasses(score) {
  const s = parseFloat(score);
  if (Number.isNaN(s)) {
    return "border border-gray-300 text-gray-700 bg-gray-50";
  }
  if (s >= 4.3) {
    return "border border-green-200 text-green-700 bg-green-50";
  }
  if (s >= 3.5) {
    return "border border-emerald-200 text-emerald-700 bg-emerald-50";
  }
  if (s >= 3.0) {
    return "border border-amber-200 text-amber-700 bg-amber-50";
  }
  return "border border-orange-200 text-orange-700 bg-orange-50";
}

export default function CourseSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [expandedProfessorId, setExpandedProfessorId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const exampleQueries = ["CS 210", "data science", "GE writing"];

  async function performSearch(q) {
    const trimmed = q.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSelectedCourse(null);
    setExpandedProfessorId(null);

    try {
      const resp = await fetch(
        `http://127.0.0.1:8000/courses/search?q=${encodeURIComponent(trimmed)}`
      );
      if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
      const data = await resp.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function doSearch(e) {
    if (e) e.preventDefault();
    await performSearch(query);
  }

  async function handleExampleClick(example) {
    setQuery(example);
    await performSearch(example);
  }

  function handleInputChange(e) {
    const value = e.target.value;
    setQuery(value);

    const trimmed = value.trim();
    if (!trimmed) {
      // Reset to suggestion state
      setResults([]);
      setSelectedCourse(null);
      setExpandedProfessorId(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Live search as user types
    performSearch(value);
  }

  function handleDragStart(e, course) {
    e.dataTransfer.setData("application/json", JSON.stringify(course));
    e.dataTransfer.effectAllowed = "copy";
  }

  function toggleProfessor(id) {
    setExpandedProfessorId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-2">Course Search</h3>

      <form onSubmit={doSearch} className="flex w-full mb-2">
        <input
          aria-label="Search courses"
          placeholder="Search courses, code, subject, topic..."
          value={query}
          onChange={handleInputChange}
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring"
        />
      </form>

      {loading && <div className="text-sm text-gray-500">Searching…</div>}
      {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}

      <div className="mt-2 flex-1 flex flex-col min-h-0">
        {selectedCourse ? (
          // DETAIL VIEW
          <div className="flex-1 border rounded bg-white flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2 border-b">
              <button
                type="button"
                onClick={() => {
                  setSelectedCourse(null);
                  setExpandedProfessorId(null);
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full border text-xs hover:bg-gray-100 shrink-0"
              >
                <span aria-hidden="true">←</span>
                <span className="sr-only">Back to results</span>
              </button>

              <div className="flex-1">
                <div className="text-sm font-semibold">
                  {selectedCourse.code}{" "}
                  <span className="font-normal text-gray-700">
                    {selectedCourse.name}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {selectedCourse.units && (
                    <span>{selectedCourse.units} units</span>
                  )}
                  {selectedCourse.typically_offered && (
                    <span className="ml-2">
                      {selectedCourse.typically_offered}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-auto p-3 text-sm text-gray-800 space-y-3">
              <div>
                <div className="font-semibold mb-1">Description</div>
                <p className="text-gray-800">{selectedCourse.description}</p>
              </div>

              {selectedCourse.prereqs && (
                <div>
                  <div className="font-semibold mb-1">Prerequisites</div>
                  <p>{selectedCourse.prereqs}</p>
                </div>
              )}

              {selectedCourse.general_education && (
                <div>
                  <div className="font-semibold mb-1">General Education</div>
                  <p>{selectedCourse.general_education}</p>
                </div>
              )}

              {selectedCourse.detail_url && (
                <div>
                  <a
                    href={selectedCourse.detail_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline text-xs"
                  >
                    View in SDSU Catalog
                  </a>
                </div>
              )}

              {/* Professors */}
              {Array.isArray(selectedCourse.professors) &&
                selectedCourse.professors.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Professors</div>
                    <div className="text-xs text-gray-600 mb-2">
                      {(() => {
                        const profs = selectedCourse.professors;
                        const diffSummary = summarizeDifficulty(profs);
                        const count = profs.length;
                        const parts = [`${count} prof${count === 1 ? "" : "s"}`];
                        if (diffSummary) {
                          parts.push(`avg difficulty ${diffSummary.avg}/5`);
                        }
                        return parts.join(" · ");
                      })()}
                    </div>

                    <ul className="space-y-2">
                      {selectedCourse.professors.map((p) => {
                        const id = String(p.id ?? "");
                        const isExpanded = expandedProfessorId === id;

                        const quality =
                          typeof p.overall_quality === "number"
                            ? p.overall_quality
                            : parseFloat(p.overall_quality);
                        const difficulty =
                          typeof p.overall_difficulty === "number"
                            ? p.overall_difficulty
                            : parseFloat(p.overall_difficulty);
                        const wta = p.would_take_again_percent;
                        const ratings = p.num_ratings;

                        const metaPieces = [];
                        if (!Number.isNaN(difficulty)) {
                          metaPieces.push(`Diff ${difficulty.toFixed(1)}`);
                        }
                        if (
                          typeof wta === "number" &&
                          !Number.isNaN(wta)
                        ) {
                          metaPieces.push(`${wta}% WTA`);
                        }
                        if (
                          typeof ratings === "number" &&
                          !Number.isNaN(ratings)
                        ) {
                          metaPieces.push(`${ratings} ratings`);
                        }

                        const extra = extraProfById.get(id) || {};
                        const department = extra.department || p.department;
                        const alsoCourses = extra.courses || p.courses;

                        return (
                          <li
                            key={id || p.name}
                            className="border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100/70 transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => toggleProfessor(id)}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2"
                            >
                              <div className="text-left">
                                <div className="text-sm font-medium text-blue-700">
                                  {p.name}
                                </div>
                                {metaPieces.length > 0 && (
                                  <div className="mt-0.5 text-[11px] text-gray-600">
                                    {metaPieces.join(" · ")}
                                  </div>
                                )}
                              </div>

                              <div
                                className={
                                  "text-xs px-3 py-1 rounded-full flex items-center gap-1 " +
                                  ratingBadgeClasses(quality)
                                }
                              >
                                <span aria-hidden="true">★</span>
                                <span>
                                  {Number.isNaN(quality)
                                    ? "N/A"
                                    : `${quality.toFixed(1)}/5`}
                                </span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-700 space-y-1">
                                {department && (
                                  <div>
                                    <span className="font-semibold">
                                      Department:{" "}
                                    </span>
                                    <span>{department}</span>
                                  </div>
                                )}
                                {Array.isArray(alsoCourses) &&
                                  alsoCourses.length > 0 && (
                                    <div>
                                      <span className="font-semibold">
                                        Also teaches:{" "}
                                      </span>
                                      <span>
                                        {alsoCourses.join(", ")}
                                      </span>
                                    </div>
                                  )}
                                {p.url && (
                                  <div>
                                    <a
                                      href={p.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 underline"
                                    >
                                      View on RateMyProfessors
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        ) : (
          // LIST VIEW
          <div className="flex flex-col gap-3 overflow-auto flex-1 p-1">
            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center text-center text-gray-600 py-6 select-none">
                {query.trim() ? (
                  <>
                    <div className="text-base font-semibold text-gray-700">
                      No courses found for “{query.trim()}”
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Try a different code, subject, or keyword.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-base font-semibold text-gray-700">
                      Search for a course to add
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Start typing a course code, subject, or topic.
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      Or try one of these:
                    </div>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {exampleQueries.map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => handleExampleClick(example)}
                          className="px-3 py-1 rounded-full border border-[#A6192E]/40 text-xs text-[#A6192E] hover:bg-[#A6192E] hover:text-white transition-colors"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {results.map((course) => {
              const code = course.code || course.id;
              const professors = course.professors || [];

              return (
                <div
                  key={code}
                  draggable
                  onDragStart={(e) => handleDragStart(e, course)}
                  className="cursor-grab active:cursor-grabbing select-none border border-gray-200 bg-white rounded-xl p-3 hover:border-black transition-all duration-150"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse(course);
                      setExpandedProfessorId(null);
                    }}
                    className="text-left w-full h-full"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {course.code}{" "}
                          <span className="font-normal text-gray-700">
                            {course.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {course.units && <span>{course.units} units</span>}
                          {course.typically_offered && (
                            <span className="ml-2">
                              {course.typically_offered}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                      {course.description}
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      {summarizeProfessors(professors)}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
