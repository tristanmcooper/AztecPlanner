// front-end-webserver/src/CourseSearch.jsx
import React, { useState } from "react";
import profIndex from "./assets/sdsu_cs_professors.json";

// Build lookup table: id -> full professor record (with courses, dept, etc.)
const PROFESSORS_BY_ID = Array.isArray(profIndex)
  ? profIndex.reduce((map, p) => {
      if (p && p.id != null) map[String(p.id)] = p;
      return map;
    }, {})
  : {};

function summarizeProfessors(professors = []) {
  if (!professors.length) return "No RMP data";
  const total = professors.reduce(
    (acc, p) =>
      acc + (typeof p.overall_quality === "number" ? p.overall_quality : 0),
    0
  );
  const countWithRating = professors.filter(
    (p) => typeof p.overall_quality === "number"
  ).length;
  const avg = countWithRating ? (total / countWithRating).toFixed(1) : null;
  const best = professors
    .filter((p) => typeof p.overall_quality === "number")
    .sort((a, b) => b.overall_quality - a.overall_quality)[0];

  if (!avg) return `${professors.length} professor(s) on RMP`;

  if (best) {
    return `${professors.length} profs · avg ${avg}/5 · top: ${best.name} (${best.overall_quality}/5)`;
  }
  return `${professors.length} profs · avg ${avg}/5`;
}

function ratingPillClasses(score) {
  if (typeof score !== "number") {
    return "border-gray-300 text-gray-700 bg-gray-50";
  }
  if (score >= 4.0) {
    return "border-green-400 text-green-800 bg-green-50";
  }
  if (score >= 3.0) {
    return "border-yellow-400 text-yellow-800 bg-yellow-50";
  }
  return "border-red-400 text-red-800 bg-red-50";
}

export default function CourseSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [expandedProfId, setExpandedProfId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function doSearch(e) {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSelectedCourse(null);
    setExpandedProfId(null);
    try {
      const resp = await fetch(
        `http://127.0.0.1:8000/courses/search?q=${encodeURIComponent(query)}`
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

  function handleDragStart(e, course) {
    e.dataTransfer.setData("application/json", JSON.stringify(course));
    e.dataTransfer.effectAllowed = "copy";
  }

  function toggleProfessor(id) {
    setExpandedProfId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-2">Course Search</h3>

      <form onSubmit={doSearch} className="flex w-full mb-2">
        <input
          aria-label="Search courses"
          placeholder="Search courses, code, subject, topic..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doSearch(e);
          }}
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring"
        />
      </form>

      {loading && <div className="text-sm text-gray-500">Searching…</div>}
      {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}

      <div className="mt-2 flex-1 flex flex-col min-h-0">
        {selectedCourse ? (
          // Detail view: header + scrollable body
          <div className="flex-1 border rounded bg-white flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2 border-b">
              <button
                type="button"
                onClick={() => {
                  setSelectedCourse(null);
                  setExpandedProfId(null);
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

              {Array.isArray(selectedCourse.professors) &&
                selectedCourse.professors.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Professors</div>
                    <div className="text-xs text-gray-600 mb-2">
                      {summarizeProfessors(selectedCourse.professors)}
                    </div>

                    <ul className="space-y-2">
                      {selectedCourse.professors.map((p) => {
                        const id = String(p.id);
                        const global = PROFESSORS_BY_ID[id] || {};
                        const quality =
                          typeof p.overall_quality === "number"
                            ? p.overall_quality
                            : typeof global.overall_quality === "number"
                            ? global.overall_quality
                            : null;
                        const difficulty =
                          typeof p.overall_difficulty === "number"
                            ? p.overall_difficulty
                            : global.overall_difficulty;
                        const wta =
                          typeof p.would_take_again_percent === "number"
                            ? p.would_take_again_percent
                            : global.would_take_again_percent;
                        const numRatings =
                          typeof p.num_ratings === "number"
                            ? p.num_ratings
                            : global.num_ratings;
                        const courses =
                          Array.isArray(global.courses) &&
                          global.courses.length > 0
                            ? global.courses
                            : [];

                        const isExpanded = expandedProfId === id;
                        const ratingClasses = ratingPillClasses(quality);

                        return (
                          <li
                            key={id}
                            className="bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-700"
                          >
                            {/* Top row: name + rating pill (click to expand) */}
                            <button
                              type="button"
                              onClick={() => toggleProfessor(id)}
                              className="flex items-center justify-between w-full text-left"
                            >
                              <div className="flex flex-col">
                                {p.url || global.url ? (
                                  <a
                                    href={p.url || global.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-blue-700 underline"
                                  >
                                    {p.name || global.name || "Unknown"}
                                  </a>
                                ) : (
                                  <span className="text-sm font-semibold text-gray-900">
                                    {p.name || global.name || "Unknown"}
                                  </span>
                                )}
                                {numRatings != null && (
                                  <span className="mt-0.5 text-[11px] text-gray-500">
                                    {numRatings} rating
                                    {numRatings === 1 ? "" : "s"}
                                  </span>
                                )}
                              </div>

                              <div
                                className={
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
                                  ratingClasses
                                }
                              >
                                {quality != null ? `${quality}/5` : "N/A"}
                              </div>
                            </button>

                            {/* Badges row */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {difficulty != null && (
                                <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px]">
                                  Diff {difficulty}
                                </span>
                              )}
                              {wta != null && (
                                <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px]">
                                  {wta}% WTA
                                </span>
                              )}
                              {numRatings != null && (
                                <span className="inline-flex items-center rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[11px]">
                                  {numRatings} rating
                                  {numRatings === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                                {global.department && (
                                  <div>
                                    <span className="font-medium">
                                      Department:
                                    </span>{" "}
                                    {global.department}
                                  </div>
                                )}

                                {courses.length > 0 && (
                                  <div>
                                    <span className="font-medium">
                                      Also teaches:
                                    </span>{" "}
                                    <span>
                                      {courses
                                        .filter(
                                          (code) =>
                                            code !== selectedCourse.code
                                        )
                                        .slice(0, 8)
                                        .join(", ")}
                                      {courses.length > 8 && " …"}
                                    </span>
                                  </div>
                                )}

                                {(p.url || global.url) && (
                                  <div>
                                    <a
                                      href={p.url || global.url}
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
          // List view with results
          <ul className="divide-y divide-gray-100 overflow-auto flex-1 w-full">
            {results.length === 0 && !loading && (
              <li className="py-2 text-gray-500 italic">No results</li>
            )}

            {results.map((course) => {
              const code = course.code || course.id;
              const professors = course.professors || [];

              return (
                <li
                  key={code}
                  className="py-2"
                  draggable
                  onDragStart={(e) => handleDragStart(e, course)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse(course);
                      setExpandedProfId(null);
                    }}
                    className="text-left w-full"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">
                        {course.code}{" "}
                        <span className="font-normal text-gray-700">
                          {course.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 ml-2 whitespace-nowrap">
                        {course.units && <span>{course.units} units</span>}
                        {course.typically_offered && (
                          <span className="ml-2">
                            {course.typically_offered}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                      {course.description}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {summarizeProfessors(professors)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
