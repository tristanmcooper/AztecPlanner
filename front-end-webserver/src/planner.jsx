import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CourseSearch from "./CourseSearch";
import AIAssistant from "./AIAssistant";
import YearView from "./YearView";
import DegreeOverview from "./DegreeOverview";
import SemesterPlanner from "./SemesterPlanner";
import "./index.css";

export default function Planner() {
  const location = useLocation();
  const { degreeData, userReq, priorReq, todoReq, classData, userInfo } = location.state || {};
  const navigate = useNavigate();

  // --- Draggable sidebar width (vertical splitter) ---
  const [sidebarWidth, setSidebarWidth] = useState(33); // %
  const [isDraggingCol, setIsDraggingCol] = useState(false);

  // --- Draggable divider between CourseSearch & AI (horizontal splitter) ---
  const [topPanePct, setTopPanePct] = useState(35); // %
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const sidebarRef = useRef(null);

  // --- Vertical drag handler ---
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

  // --- Horizontal drag handler ---
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

  const mainWidth = 100 - sidebarWidth;

  return (
    <div className="flex mt-[50px] items-start h-[calc(100vh-50px)] overflow-hidden">
      {/* --- Main Planner --- */}
      <main
        className="h-full px-2 py-6 overflow-auto"
        style={{ width: `${mainWidth}%` }}
      >
        <div className="bg-white p-4">
          {/* --- Degree Overview heading --- */}
          <h2 className="text-5xl font-bold text-black mb-6 mt-1 text-left">
            Degree Overview{userInfo ? ` - ${userInfo.firstName} ${userInfo.lastName}` : ""}
          </h2>

          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Degree Overview</h2>
              <button
                className="ml-4 px-3 py-1 bg-blue-600 text-white rounded"
                onClick={() => {
                  // navigate to semester planner and pass degreeData in navigation state
                  navigate('/semester-planner', { state: { degreeData, priorReq, todoReq, userInfo } });
                }}
              >
                Open Semester Planner
              </button>
            </div>
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
            {/* SemesterPlanner receives degreeData from Planner via separate page route */}
          </div>
        </div>
      </main>


      {/* --- Vertical Split Handle --- */}
      <div
        className={`h-full w-[6px] cursor-col-resize transition-colors ${
          isDraggingCol ? "bg-gray-400" : "bg-gray-200 hover:bg-gray-300"
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDraggingCol(true);
        }}
      />

      {/* --- Sidebar --- */}
      <aside
        ref={sidebarRef}
        className="h-full flex flex-col bg-gray-50 overflow-hidden"
        style={{ width: `${sidebarWidth}%` }}
      >
        {/* --- CourseSearch --- */}
        <div className="overflow-y-auto" style={{ height: `${topPanePct}%` }}>
          <CourseSearch />
        </div>

        {/* --- Horizontal Split Handle --- */}
        <div
          className={`w-full h-[6px] cursor-row-resize transition-colors ${
            isDraggingRow ? "bg-gray-400" : "bg-gray-200 hover:bg-gray-300"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingRow(true);
          }}
        />

        {/* --- AIAssistant --- */}
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