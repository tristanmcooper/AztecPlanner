// import React from "react";
// import { useLocation } from "react-router-dom";
// import CourseSearch from "./CourseSearch";
// import AIAssistant from "./AIAssistant";
// import YearView from "./YearView";
// import "./index.css";

// export default function Planner() {
//   const location = useLocation();
//   const { degreeData, userReq, priorReq, todoReq, classData } = location.state || {};

//   return (
//     <div className="flex mt-16 items-start">
//       <main className="flex-1 p-4 mr-[33%]"> {/* Leave space for the fixed sidebar */}
//         <div className="bg-white border rounded p-4">
//           <h1 className="text-xl font-bold mb-4">Planner</h1>

//           <div className="space-y-10">
//             {degreeData
//               ? Object.entries(degreeData).map(([year, semesters]) => (
//                   <YearView
//                     key={year}
//                     yearLabel={`${year} – ${parseInt(year) + 1}`}
//                     data={semesters}
//                   />
//                 ))
//               : (
//                 <>
//                   <YearView yearLabel="2022 – 2023" />
//                   <YearView yearLabel="2023 – 2024" />
//                   <YearView yearLabel="2024 – 2025" />
//                   <YearView yearLabel="2025 – 2026" />
//                 </>
//               )}
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
// src/Planner.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import CourseSearch from "./CourseSearch";
import AIAssistant from "./AIAssistant";
import YearView from "./YearView";
import "./index.css";

export default function Planner() {
  const location = useLocation();
  const { degreeData, userReq, priorReq, todoReq, classData } =
    location.state || {};

  // --- vertical splitter (planner vs sidebar) ---
  const [sidebarWidth, setSidebarWidth] = useState(33); // % of window width
  const [isDraggingCol, setIsDraggingCol] = useState(false);

  // --- horizontal splitter (CourseSearch vs AI) ---
  const [topPanePct, setTopPanePct] = useState(35); // % of sidebar height
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const sidebarRef = useRef(null);

  // vertical drag between planner and sidebar
  useEffect(() => {
    if (!isDraggingCol) return;

    function handleMouseMove(e) {
      const total = window.innerWidth || 1;
      const rawPct = ((total - e.clientX) / total) * 100;
      const clamped = Math.min(45, Math.max(20, rawPct)); // 20–45% sidebar
      setSidebarWidth(clamped);
    }

    function handleMouseUp() {
      setIsDraggingCol(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingCol]);

  // horizontal drag between CourseSearch and AI
  useEffect(() => {
    if (!isDraggingRow) return;

    function handleMouseMove(e) {
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const pct = (offsetY / rect.height) * 100;
      const clamped = Math.min(80, Math.max(20, pct)); // each gets at least 20%
      setTopPanePct(clamped);
    }

    function handleMouseUp() {
      setIsDraggingRow(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingRow]);

  const handleColDragStart = (e) => {
    e.preventDefault();
    setIsDraggingCol(true);
  };

  const handleRowDragStart = (e) => {
    e.preventDefault();
    setIsDraggingRow(true);
  };

  const mainWidth = 100 - sidebarWidth;

  return (
    <div className="flex mt-16 items-start h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main planner area */}
      <main
        className="h-full p-4 overflow-auto"
        style={{ width: `${mainWidth}%` }}
      >
        <div className="bg-white border rounded p-4">
          <h1 className="text-xl font-bold mb-4">Planner</h1>

          {degreeData ? (
            <div className="space-y-6">
              {Object.entries(degreeData).map(([year, semesters]) => (
                <div key={year}>
                  <h2 className="text-lg font-semibold mb-2">
                    {year} Academic Year
                  </h2>
                  {Object.entries(semesters).map(([term, classes]) => (
                    <div
                      key={term}
                      className="mb-4 border rounded-lg bg-gray-50 p-3"
                    >
                      <h3 className="text-md font-semibold mb-2">
                        {term} Semester
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {classes.map((c, i) => (
                          <div
                            key={i}
                            className="p-2 border rounded bg-white shadow-sm"
                          >
                            <p className="font-semibold">{c.code}</p>
                            <p className="text-sm text-gray-700">{c.title}</p>
                            <p className="text-sm">
                              <strong>Credits:</strong> {c.credit}
                            </p>
                            <p className="text-sm">
                              <strong>Grade:</strong> {c.grade}
                            </p>
                            <p className="text-sm">
                              <strong>Status:</strong> {c.status}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              <YearView yearLabel="2022 – 2023" />
              <YearView yearLabel="2023 – 2024" />
              <YearView yearLabel="2024 – 2025" />
              <YearView yearLabel="2025 – 2026" />
            </div>
          )}
        </div>
      </main>

      {/* Vertical drag handle – now a clear gray grab bar */}
      <div
        className="h-full flex items-center"
        style={{ width: "14px" }}
      >
        <div
          className={`mx-auto h-24 w-1 rounded-full cursor-col-resize ${
            isDraggingCol ? "bg-gray-400" : "bg-gray-300"
          }`}
          onMouseDown={handleColDragStart}
        />
      </div>

      {/* Sidebar with horizontal splitter */}
      <aside
        ref={sidebarRef}
        className="h-full flex flex-col p-4 bg-gray-50 border-l overflow-hidden"
        style={{ width: `${sidebarWidth}%` }}
      >
        {/* Course search pane */}
        <div
          className="overflow-y-auto"
          style={{ height: `${topPanePct}%` }}
        >
          <CourseSearch />
        </div>

        {/* Horizontal drag handle – same gray grab-bar look */}
        <div className="w-full flex items-center justify-center my-2">
          <div
            className={`h-1 w-24 rounded-full cursor-row-resize ${
              isDraggingRow ? "bg-gray-400" : "bg-gray-300"
            }`}
            onMouseDown={handleRowDragStart}
          />
        </div>

        {/* AI assistant pane */}
        <div
          className="overflow-y-auto"
          style={{ height: `${100 - topPanePct}%` }}
        >
          <AIAssistant />
        </div>
      </aside>
    </div>
  );
}
