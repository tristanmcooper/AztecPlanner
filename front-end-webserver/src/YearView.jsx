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
      for (let t of terms) updated[t] = [...prev[t]];

      const targetCourse = updated[targetTerm][targetIndex];
      updated[targetTerm][targetIndex] = course;
      updated[sourceTerm][sourceIndex] = targetCourse || null;

      return updated;
    });
  };

  const handleDelete = (term, index) => {
    setDropped((prev) => {
      const updated = { ...prev };
      updated[term] = [...prev[term]];
      updated[term][index] = null;
      return updated;
    });
  };

  return (
    <div className="w-full max-w-[932px] flex flex-col gap-4">
      {/* Year Header */}
      <div className="p-3.5 bg-rose-800 outline outline-1 outline-white flex justify-between items-center rounded-sm">
        <div className="text-white text-xl font-bold">{yearLabel}</div>
        <div className="text-white text-xl font-bold">Units: 0</div>
      </div>

      {/* Terms */}
      <div className="flex flex-wrap gap-4">
        {terms.map((term) => (
          <div key={term} className="flex flex-col">
            {/* Term Header */}
            <div className="w-72 h-10 p-2.5 outline outline-1 outline-black flex justify-between items-center">
              <div className="text-black text-xl font-semibold">
                {term} {yearLabel.split(" – ")[0]}
              </div>
              <div className="text-black text-base font-semibold">Units: 0</div>
            </div>

            {/* Course Slots */}
            <div className="pt-2.5 flex flex-col gap-[5px]">
              {(dropped[term] || []).map((course, i) => (
                <div
                  key={i}
                  draggable={!!course}
                  onDragStart={(e) => handleDragStart(term, i, e)}
                  onDrop={(e) => handleDrop(term, i, e)}
                  onDragOver={allowDrop}
                  className={`w-72 min-h-[56px] px-2.5 py-1.5 rounded-[5px] outline outline-1 outline-black/20 flex flex-col justify-center items-start overflow-hidden transition-colors relative
                    ${course ? "bg-white cursor-move hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"}`}
                >
                  {course ? (
                    <>
                      {/* Header Row */}
                      <div className="w-full flex justify-between items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-black text-base font-normal truncate">
                            <span className="font-semibold">{course.code}</span>
                            {" - "}
                            {course.title}
                          </div>
                        </div>

                        {/* X Button */}
                        <button
                          onClick={() => handleDelete(term, i)}
                          className="flex-shrink-0 ml-1 text-gray-400 hover:text-black text-sm font-bold transition"
                          aria-label="Delete course"
                        >
                          ×
                        </button>
                      </div>

                      {/* Info Tags */}
                      <div className="flex justify-start items-center flex-wrap gap-1 mt-1.5">
                        {course.credit && (
                          <div className="px-1.5 py-0.5 rounded-[10px] outline outline-[0.5px] outline-black text-xs font-medium">
                            Units: {course.credit}
                          </div>
                        )}
                        {course.grade && (
                          <div className="px-1.5 py-0.5 rounded-[10px] outline outline-[0.5px] outline-black text-xs font-medium">
                            Grade: {course.grade}
                          </div>
                        )}
                        <div className="px-1.5 py-0.5 rounded-[10px] outline outline-[0.5px] outline-black text-xs font-medium">
                          Difficulty: Easy
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full text-center text-black text-xs font-semibold py-2">
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