import { useLocation } from "react-router-dom";
import CourseSearch from "./CourseSearch";
import AIAssistant from "./AIAssistant";
import YearView from "./YearView";
import "./index.css";

export default function Planner() {
  const location = useLocation();
  const { degreeData, userReq, priorReq, todoReq, classData } = location.state || {};

  return (
    <div className="flex mt-16 items-start">
      <main className="flex-1 p-4 mr-[33%]"> {/* Leave space for the fixed sidebar */}
        <div className="bg-white border rounded p-4">
          <h1 className="text-xl font-bold mb-4">Planner</h1>

          <div className="space-y-10">
            {degreeData
              ? Object.entries(degreeData).map(([year, semesters]) => (
                  <YearView
                    key={year}
                    yearLabel={`${year} – ${parseInt(year) + 1}`}
                    data={semesters}
                  />
                ))
              : (
                <>
                  <YearView yearLabel="2022 – 2023" />
                  <YearView yearLabel="2023 – 2024" />
                  <YearView yearLabel="2024 – 2025" />
                  <YearView yearLabel="2025 – 2026" />
                </>
              )}
          </div>
        </div>
      </main>

      {/* Fixed sidebar */}
      <aside className="fixed right-0 top-[4rem] w-1/3 h-[calc(100vh-4rem)] flex flex-col p-4 bg-gray-50 border-l">
        <div className="basis-[30%] overflow-y-auto">
          <CourseSearch />
        </div>
        <div className="basis-[70%] overflow-y-auto mt-4">
          <AIAssistant />
        </div>
      </aside>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CourseSearch from "./CourseSearch";
import AIAssistant from "./AIAssistant";
import "./index.css";

// Default empty plan when there is no degreeData coming from the audit.
// You can change these labels/years however you like.
const DEFAULT_PLAN = {
  "2022 – 2023": { Fall: [], Spring: [], Summer: [] },
  "2023 – 2024": { Fall: [], Spring: [], Summer: [] },
  "2024 – 2025": { Fall: [], Spring: [], Summer: [] },
  "2025 – 2026": { Fall: [], Spring: [], Summer: [] },
};

function normalizeCourseFromSearch(raw) {
  if (!raw) return null;
  return {
    code: raw.code ?? raw.title ?? raw.name ?? "Unknown code",
    name: raw.name ?? raw.title ?? "",
    units: raw.units ?? raw.credit ?? "",
    description: raw.description ?? "",
    typically_offered: raw.typically_offered ?? raw.offered ?? "",
    professors: Array.isArray(raw.professors) ? raw.professors : [],
    // keep anything else around in case you want it later
    raw,
  };
}

function PlannedCourseCard({ course }) {
  const [open, setOpen] = useState(false);
  const hasProfessors =
    Array.isArray(course.professors) && course.professors.length > 0;

  return (
    <div
      className="border rounded bg-white shadow-sm px-2 py-2 text-sm cursor-pointer hover:border-blue-400 transition-colors"
      onClick={() => setOpen((o) => !o)}
    >
      <div className="flex justify-between items-center gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{course.code}</div>
          <div className="text-xs text-gray-700 truncate">{course.name}</div>
        </div>
        {course.units && (
          <span className="text-xs text-gray-500 shrink-0">
            {course.units} units
          </span>
        )}
      </div>

      {course.typically_offered && (
        <div className="text-xs text-gray-500 mt-1">
          Offered: {course.typically_offered}
        </div>
      )}

      {open && (
        <div className="mt-2 space-y-2">
          {course.description && (
            <p className="text-xs text-gray-700 leading-snug">
              {course.description}
            </p>
          )}

          {hasProfessors && (
            <div>
              <div className="text-xs font-semibold mb-1">
                Professors (RateMyProf):
              </div>
              <ul className="space-y-0.5">
                {course.professors.map((p) => (
                  <li
                    key={p.id}
                    className="text-xs flex justify-between items-center gap-2"
                  >
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.name}
                    </a>
                    <span className="text-gray-600 shrink-0">
                      {p.overall_quality != null && (
                        <span>
                          {typeof p.overall_quality === "number"
                            ? p.overall_quality.toFixed(1)
                            : p.overall_quality}
                          /5
                        </span>
                      )}
                      {p.would_take_again_percent != null && (
                        <span className="ml-1">
                          ({p.would_take_again_percent}% again)
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// function buildPlanFromDegreeData(degreeData) {
//   if (!degreeData) return DEFAULT_PLAN;

//   const plan = {};
//   for (const [year, semesters] of Object.entries(degreeData)) {
//     plan[year] = plan[year] || {};
//     for (const [term, classes] of Object.entries(semesters)) {
//       plan[year][term] = (classes || []).map((c) => ({
//         code: c.code ?? c.title ?? "",
//         name: c.title ?? c.name ?? "",
//         units: c.credit ?? c.units ?? "",
//         description: c.description ?? "",
//         typically_offered: c.typically_offered ?? "",
//         professors: [], // audit data won't have profs; search-dropped ones will
//         raw: c,
//       }));
//     }
//   }
//   return plan;
// }

// export default function Planner() {
//   const location = useLocation();
//   const { degreeData } = location.state || {};

//   const [plan, setPlan] = useState(() =>
//     buildPlanFromDegreeData(degreeData)
//   );

//   // If the user comes back with a different audit, rebuild the plan.
//   useEffect(() => {
//     setPlan(buildPlanFromDegreeData(degreeData));
//   }, [degreeData]);

//   function addCourseToTerm(yearLabel, termLabel, rawCourse) {
//     const normalized = normalizeCourseFromSearch(rawCourse);
//     if (!normalized) return;

//     setPlan((prev) => {
//       const next = { ...prev };
//       const yearBlock = { ...(next[yearLabel] || {}) };
//       const existing = yearBlock[termLabel] ? [...yearBlock[termLabel]] : [];

//       // Simple dedupe on course code
//       if (!existing.some((c) => c.code === normalized.code)) {
//         existing.push(normalized);
//       }

//       yearBlock[termLabel] = existing;
//       next[yearLabel] = yearBlock;
//       return next;
//     });
//   }

//   function handleDrop(e, yearLabel, termLabel) {
//     e.preventDefault();
//     const json = e.dataTransfer.getData("application/json");
//     if (!json) return;
//     try {
//       const course = JSON.parse(json);
//       addCourseToTerm(yearLabel, termLabel, course);
//     } catch {
//       // bad payload; ignore
//     }
//   }

//   return (
//     <div className="flex mt-16 items-start">
//       <main className="flex-1 p-4 mr-[33%]">
//         <div className="bg-white border rounded p-4 h-full">
//           <h1 className="text-xl font-bold mb-4">Planner</h1>

//           <div className="space-y-6">
//             {Object.entries(plan).map(([yearLabel, semesters]) => (
//               <div key={yearLabel}>
//                 <h2 className="text-lg font-semibold mb-2">
//                   {yearLabel} Academic Year
//                 </h2>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                   {Object.entries(semesters).map(([termLabel, courses]) => (
//                     <div
//                       key={`${yearLabel}-${termLabel}`}
//                       className="mb-2 border rounded-lg bg-gray-50 p-3 min-h-[140px]"
//                       onDragOver={(e) => e.preventDefault()} // allow drop
//                       onDrop={(e) => handleDrop(e, yearLabel, termLabel)}
//                     >
//                       <h3 className="text-md font-semibold mb-2">
//                         {termLabel} Semester
//                       </h3>

//                       {(!courses || courses.length === 0) && (
//                         <p className="text-xs text-gray-400 italic">
//                           Drag a course from the search panel into this term.
//                         </p>
//                       )}

//                       {courses && courses.length > 0 && (
//                         <div className="flex flex-col gap-2">
//                           {courses.map((c, idx) => (
//                             <PlannedCourseCard key={`${c.code}-${idx}`} course={c} />
//                           ))}
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </main>

//       {/* Fixed sidebar */}
//       <aside className="fixed right-0 top-[4rem] w-1/3 h-[calc(100vh-4rem)] flex flex-col p-4 bg-gray-50 border-l">
//         <div className="basis-[30%] overflow-y-auto">
//           <CourseSearch />
//         </div>
//         <div className="basis-[70%] overflow-y-auto mt-4">
//           <AIAssistant />
//         </div>
//       </aside>
//     </div>
//   );
// }
