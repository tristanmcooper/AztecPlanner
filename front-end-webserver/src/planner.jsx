import React from "react";
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
