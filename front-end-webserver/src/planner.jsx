import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CourseSearch from "./CourseSearch";
import AIAssistant from "./AIAssistant";
import YearView from "./YearView";
import DegreeOverview from "./DegreeOverview";
import "./index.css";

export default function Planner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { degreeData, userReq, priorReq, todoReq, classData, userInfo } = location.state || {};

  // --- Vertical Sidebar ---
  const [sidebarWidth, setSidebarWidth] = useState(33);
  const [isDraggingCol, setIsDraggingCol] = useState(false);

  // --- Horizontal Split (CourseSearch / AI Assistant) ---
  const [topPanePct, setTopPanePct] = useState(35);
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const sidebarRef = useRef(null);

  // --- Vertical drag handler ---
  useEffect(() => {
    if (!isDraggingCol) return;

    const handleMouseMove = (e) => {
      const total = window.innerWidth || 1;
      const rawPct = ((total - e.clientX) / total) * 100;
      setSidebarWidth(Math.min(45, Math.max(20, rawPct)));
    };
    const handleMouseUp = () => setIsDraggingCol(false);

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

    const handleMouseMove = (e) => {
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setTopPanePct(Math.min(80, Math.max(20, pct)));
    };
    const handleMouseUp = () => setIsDraggingRow(false);

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
          {/* Degree Overview Heading */}
          {priorReq && (
            <>
              <h2 className="text-4xl font-bold text-black mb-6 text-left">
                Degree Overview
                {userInfo ? ` - ${userInfo.firstName} ${userInfo.lastName}` : ""}
              </h2>
              <DegreeOverview priorReq={priorReq} userInfo={userInfo} />
            </>
          )}

          {/* Year Views */}
          <div className="mt-6 space-y-10">
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

      {/* --- Vertical Split Handle --- */}
      <div
        className={`h-full w-[6px] cursor-col-resize transition-colors ${
          isDraggingCol ? "bg-gray-400" : "bg-gray-200 hover:bg-gray-300"
        }`}
        onMouseDown={(e) => { e.preventDefault(); setIsDraggingCol(true); }}
      />

      {/* --- Sidebar --- */}
      <aside
        ref={sidebarRef}
        className="h-full flex flex-col bg-gray-50 overflow-hidden relative"
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
          onMouseDown={(e) => { e.preventDefault(); setIsDraggingRow(true); }}
        />

        {/* --- AI Assistant + Semester Planner button --- */}
        <div className="overflow-y-auto relative" style={{ height: `${100 - topPanePct}%` }}>
          <AIAssistant />

          {/* Button in top-right corner */}
          <div className="absolute top-2 right-2 z-10">
            <button
              className="px-3 py-1 bg-[#A6192E] text-white rounded"
              onClick={() => navigate('/semester-planner', {
                state: { degreeData, priorReq, todoReq, userInfo }
              })}
            >
              Open Semester Planner ✦
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
