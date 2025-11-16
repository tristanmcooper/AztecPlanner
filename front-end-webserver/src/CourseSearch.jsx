// // import React, { useState } from "react";

// // export default function CourseSearch() {
// //   const [query, setQuery] = useState("");
// //   const [results, setResults] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState(null);

// //   async function doSearch(e) {
// //     e && e.preventDefault();
// //     if (!query) return;
// //     setLoading(true);
// //     setError(null);
// //     try {
// //     const resp = await fetch(`http://127.0.0.1:8000/courses/search?q=${encodeURIComponent(query)}`);
// //       if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
// //       const data = await resp.json();
// //       setResults(Array.isArray(data) ? data : []);
// //     } catch (err) {
// //       setError(err.message || String(err));
// //     } finally {
// //       setLoading(false);
// //     }
// //   }



// //   return (
// //     <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
// //       <h3 className="text-lg font-semibold mb-2">Course Search</h3>

// //       <form onSubmit={doSearch} className="flex w-full">
// //         <input
// //           aria-label="Search courses"
// //           placeholder="Search courses, code, subject, topic..."
// //           value={query}
// //           onChange={(e) => setQuery(e.target.value)}
// //           onKeyDown={(e) => {
// //             if (e.key === "Enter") doSearch(e);
// //           }}
// //           className="flex-1 px-3 py-2 border rounded-l focus:outline-none focus:ring"
// //         />

// //       </form>

// //       {error && <div className="text-red-600 mt-2">{error}</div>}

// //       <ul className="mt-3 divide-y divide-gray-100 overflow-auto flex-1 w-full">
// //         {results.length === 0 && !loading && (
// //           <li className="py-2 text-gray-500 italic">No results</li>
// //         )}
// //         {results.map((r, idx) => (
// //           <li
// //             key={r.id ?? r.code ?? idx}
// //             className="py-2 flex items-center justify-between"
// //           >
// //             <div className="truncate pr-4">
// //               <div className="font-medium">{r.code ?? r.title ?? r.name}</div>
// //               <div className="text-sm text-gray-600 truncate">{r.title ? r.title : r.description}</div>
// //             </div>
// //             <div>
// //               <button
// //                 onClick={() => selectCourse(r)}
// //                 className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
// //               >
// //                 Add
// //               </button>
// //             </div>
// //           </li>
// //         ))}
// //       </ul>
// //     </div>
// //   );
// // }

// // front-end-webserver/src/CourseSearch.jsx
// import React, { useState } from "react";

// function summarizeProfessors(professors = []) {
//   if (!professors.length) return "No RMP data";
//   const total = professors.reduce(
//     (acc, p) => acc + (typeof p.overall_quality === "number" ? p.overall_quality : 0),
//     0
//   );
//   const countWithRating = professors.filter(
//     (p) => typeof p.overall_quality === "number"
//   ).length;
//   const avg = countWithRating ? (total / countWithRating).toFixed(1) : null;
//   const best = professors
//     .filter((p) => typeof p.overall_quality === "number")
//     .sort((a, b) => b.overall_quality - a.overall_quality)[0];

//   if (!avg) return `${professors.length} professor(s) on RMP`;

//   if (best) {
//     return `${professors.length} profs · avg ${avg}/5 · top: ${best.name} (${best.overall_quality}/5)`;
//   }
//   return `${professors.length} profs · avg ${avg}/5`;
// }

// export default function CourseSearch({ onAddCourse }) {
//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState([]);
//   const [expandedCode, setExpandedCode] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   async function doSearch(e) {
//     if (e) e.preventDefault();
//     if (!query.trim()) return;
//     setLoading(true);
//     setError(null);
//     try {
//       const resp = await fetch(
//         `http://127.0.0.1:8000/courses/search?q=${encodeURIComponent(query)}`
//       );
//       if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
//       const data = await resp.json();
//       setResults(Array.isArray(data) ? data : []);
//     } catch (err) {
//       setError(err.message || String(err));
//     } finally {
//       setLoading(false);
//     }
//   }

//   function handleAdd(course) {
//     if (typeof onAddCourse === "function") {
//       onAddCourse(course);
//     } else {
//       // Safe default so nothing explodes while your teammate wires the planner side.
//       console.log("Add course (no onAddCourse handler provided):", course);
//     }
//   }

//   function handleDragStart(e, course) {
//     // HTML5 drag payload; planner/YearView can read this.
//     e.dataTransfer.setData("application/json", JSON.stringify(course));
//     e.dataTransfer.effectAllowed = "copy";
//   }

//   return (
//     <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
//       <h3 className="text-lg font-semibold mb-2">Course Search</h3>

//       <form onSubmit={doSearch} className="flex w-full mb-2">
//         <input
//           aria-label="Search courses"
//           placeholder="Search courses, code, subject, topic..."
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           onKeyDown={(e) => {
//             if (e.key === "Enter") doSearch(e);
//           }}
//           className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring"
//         />
//       </form>

//       {loading && <div className="text-sm text-gray-500">Searching…</div>}
//       {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}

//       <ul className="mt-2 divide-y divide-gray-100 overflow-auto flex-1 w-full">
//         {results.length === 0 && !loading && (
//           <li className="py-2 text-gray-500 italic">No results</li>
//         )}

//         {results.map((course) => {
//           const code = course.code || course.id;
//           const isExpanded = expandedCode === code;
//           const professors = course.professors || [];

//           return (
//             <li
//               key={code}
//               className="py-2"
//               draggable
//               onDragStart={(e) => handleDragStart(e, course)}
//             >
//               {/* collapsed header row */}
//               <div className="flex items-start justify-between gap-2">
//                 <button
//                   type="button"
//                   onClick={() =>
//                     setExpandedCode((prev) => (prev === code ? null : code))
//                   }
//                   className="text-left flex-1"
//                 >
//                   <div className="flex items-center justify-between">
//                     <div className="font-semibold">
//                       {course.code}{" "}
//                       <span className="font-normal text-gray-700">
//                         {course.name}
//                       </span>
//                     </div>
//                     <div className="text-xs text-gray-600 ml-2 whitespace-nowrap">
//                       {course.units && <span>{course.units} units</span>}
//                       {course.typically_offered && (
//                         <span className="ml-2">
//                           {course.typically_offered}
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                   <div className="text-sm text-gray-700 mt-1 line-clamp-2">
//                     {course.description}
//                   </div>
//                   <div className="text-xs text-gray-500 mt-1">
//                     {summarizeProfessors(professors)}
//                   </div>
//                 </button>

//                 <button
//                   type="button"
//                   onClick={() => handleAdd(course)}
//                   className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 ml-2 shrink-0"
//                 >
//                   Add
//                 </button>
//               </div>

//               {/* expanded details */}
//               {isExpanded && (
//                 <div className="mt-2 border-t pt-2 text-sm text-gray-800 space-y-2">
//                   <div>
//                     <span className="font-semibold">Description: </span>
//                     <span>{course.description}</span>
//                   </div>

//                   {course.prereqs && (
//                     <div>
//                       <span className="font-semibold">Prereqs: </span>
//                       <span>{course.prereqs}</span>
//                     </div>
//                   )}

//                   {course.general_education && (
//                     <div>
//                       <span className="font-semibold">GE: </span>
//                       <span>{course.general_education}</span>
//                     </div>
//                   )}

//                   {course.detail_url && (
//                     <div>
//                       <a
//                         href={course.detail_url}
//                         target="_blank"
//                         rel="noreferrer"
//                         className="text-blue-600 underline"
//                       >
//                         View in SDSU Catalog
//                       </a>
//                     </div>
//                   )}

//                   {professors.length > 0 && (
//                     <div>
//                       <div className="font-semibold mb-1">Professors:</div>
//                       <ul className="space-y-1">
//                         {professors.map((p) => (
//                           <li key={p.id} className="flex justify-between gap-2">
//                             <div>
//                               <a
//                                 href={p.url}
//                                 target="_blank"
//                                 rel="noreferrer"
//                                 className="text-blue-600 underline"
//                               >
//                                 {p.name}
//                               </a>
//                               <span className="text-xs text-gray-600 ml-2">
//                                 {typeof p.overall_quality === "number"
//                                   ? `${p.overall_quality}/5`
//                                   : "N/A"}
//                                 {" · "}
//                                 diff{" "}
//                                 {typeof p.overall_difficulty === "number"
//                                   ? p.overall_difficulty
//                                   : "N/A"}
//                                 {typeof p.num_ratings === "number" &&
//                                   ` · ${p.num_ratings} ratings`}
//                               </span>
//                             </div>
//                             {typeof p.would_take_again_percent === "number" && (
//                               <div className="text-xs text-gray-600 whitespace-nowrap">
//                                 {p.would_take_again_percent}% WTA
//                               </div>
//                             )}
//                           </li>
//                         ))}
//                       </ul>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </li>
//           );
//         })}
//       </ul>
//     </div>
//   );
// }

// front-end-webserver/src/CourseSearch.jsx
import React, { useState } from "react";

function summarizeProfessors(professors = []) {
  if (!professors.length) return "No RMP data";
  const total = professors.reduce(
    (acc, p) => acc + (typeof p.overall_quality === "number" ? p.overall_quality : 0),
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

export default function CourseSearch({ onAddCourse }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function doSearch(e) {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSelectedCourse(null); // reset detail view on new search
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

  function handleAdd(course) {
    if (typeof onAddCourse === "function") {
      onAddCourse(course);
    } else {
      console.log("Add course (no onAddCourse handler provided):", course);
    }
  }

  function handleDragStart(e, course) {
    e.dataTransfer.setData("application/json", JSON.stringify(course));
    e.dataTransfer.effectAllowed = "copy";
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

      {/* Main content area: either list of results or a full detail view */}
      <div className="mt-2 flex-1 flex flex-col min-h-0">
        {selectedCourse ? (
          // Detail view fills the search section
          <div className="flex-1 overflow-auto border rounded p-3 text-sm text-gray-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">
                  {selectedCourse.code}{" "}
                  <span className="font-normal text-gray-700">
                    {selectedCourse.name}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {selectedCourse.units && <span>{selectedCourse.units} units</span>}
                  {selectedCourse.typically_offered && (
                    <span className="ml-2">{selectedCourse.typically_offered}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAdd(selectedCourse)}
                  className="text-xs bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                >
                  Add to planner
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="text-xs border px-3 py-1 rounded hover:bg-gray-50"
                >
                  Back to results
                </button>
              </div>
            </div>

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
                  <div className="text-xs text-gray-600 mb-1">
                    {summarizeProfessors(selectedCourse.professors)}
                  </div>
                  <ul className="space-y-1">
                    {selectedCourse.professors.map((p) => (
                      <li key={p.id} className="flex justify-between gap-2">
                        <div>
                          {p.url ? (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline"
                            >
                              {p.name}
                            </a>
                          ) : (
                            <span>{p.name}</span>
                          )}
                          <span className="text-xs text-gray-600 ml-2">
                            {typeof p.overall_quality === "number"
                              ? `${p.overall_quality}/5`
                              : "N/A"}
                            {" · "}
                            diff{" "}
                            {typeof p.overall_difficulty === "number"
                              ? p.overall_difficulty
                              : "N/A"}
                            {typeof p.num_ratings === "number" &&
                              ` · ${p.num_ratings} ratings`}
                          </span>
                        </div>
                        {typeof p.would_take_again_percent === "number" && (
                          <div className="text-xs text-gray-600 whitespace-nowrap">
                            {p.would_take_again_percent}% WTA
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCourse(course)}
                      className="text-left flex-1"
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

                    <button
                      type="button"
                      onClick={() => handleAdd(course)}
                      className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300 ml-2 shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
