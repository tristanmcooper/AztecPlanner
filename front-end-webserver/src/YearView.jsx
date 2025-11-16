import React, { useState } from "react";

export default function YearView({ yearLabel, data = {} }) {
  const terms = ["Fall", "Spring", "Summer"];
  const [dropped, setDropped] = useState({
    Fall: data.Fall || Array(5).fill(null),
    Spring: data.Spring || Array(5).fill(null),
    Summer: data.Summer || Array(5).fill(null),
  });

  const handleDragStart = (term, index, e) => {
    const course = dropped[term][index];
    if (!course) return;
    e.dataTransfer.setData(
      "dragInfo",
      JSON.stringify({ term, index, course })
    );
  };

  const allowDrop = (e) => e.preventDefault();

  const handleDrop = (targetTerm, targetIndex, e) => {
    e.preventDefault();
    const dragInfo = JSON.parse(e.dataTransfer.getData("dragInfo"));
    if (!dragInfo) return;

    const { term: sourceTerm, index: sourceIndex, course } = dragInfo;

    setDropped((prev) => {
      const updated = { ...prev };

      // Make deep copies of each term array
      for (let t of terms) updated[t] = [...prev[t]];

      const targetCourse = updated[targetTerm][targetIndex];

      // Swap if target has a course
      updated[targetTerm][targetIndex] = course;
      updated[sourceTerm][sourceIndex] = targetCourse || null;

      return updated;
    });
  };

  return (
    <div className="w-full max-w-[932px] flex flex-col gap-4">
      <div className="p-3.5 bg-rose-800 outline outline-1 outline-white flex justify-between items-center">
        <div className="text-white text-xl font-bold">{yearLabel}</div>
        <div className="text-white text-xl font-bold">Units: 0</div>
      </div>

      <div className="flex flex-wrap gap-4">
        {terms.map((term) => (
          <div key={term} className="flex flex-col">
            <div className="w-72 h-10 p-2.5 outline outline-1 outline-black flex justify-between items-center">
              <div className="text-black text-xl font-semibold">
                {term} {yearLabel.split(" – ")[0]}
              </div>
              <div className="text-black text-base font-semibold">Units: 0</div>
            </div>

            <div className="pt-2.5 flex flex-col gap-[5px]">
              {(dropped[term] || []).map((course, i) => (
                <div
                  key={i}
                  draggable={!!course}
                  onDragStart={(e) => handleDragStart(term, i, e)}
                  onDrop={(e) => handleDrop(term, i, e)}
                  onDragOver={allowDrop}
                  className={`w-72 h-14 px-2.5 py-1.5 rounded-[5px] outline outline-1 outline-black/20 flex flex-col justify-center items-start overflow-hidden transition-colors
                    ${course ? "bg-white cursor-move" : "bg-gray-50"} hover:bg-gray-100`}
                >
                  {course ? (
                    <>
                      <div className="text-sm font-semibold">{course.code}</div>
                      <div className="text-xs text-gray-700">{course.title}</div>
                    </>
                  ) : (
                    <div className="self-stretch text-center text-black text-xs font-semibold">
                      Drop course here
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}