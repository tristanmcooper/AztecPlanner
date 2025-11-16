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
};