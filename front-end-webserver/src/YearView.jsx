import React, { useState, useMemo } from "react";

export default function YearView({ yearLabel, data = {} }) {
  const terms = ["Fall", "Spring", "Summer"];
  const termIndices = { Fall: 0, Spring: 1, Summer: 2 };

  const [dropped, setDropped] = useState({
    Fall: data.Fall || [],
    Spring: data.Spring || [],
    Summer: data.Summer || [],
  });

  // --- Find the earliest semester with "In Progress" ---
  const earliestInProgressIndex = useMemo(() => {
    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      if ((dropped[term] || []).some(c => c.status === "In Progress")) {
        return i;
      }
    }
    return terms.length; // no "In Progress", so no droppable
  }, [dropped]);

  const termUnits = {};
  terms.forEach(term => {
    termUnits[term] = (dropped[term] || []).length * 3;
  });
  const yearUnits = Object.values(termUnits).reduce((sum, u) => sum + u, 0);

  const handleDragStart = (term, index, e) => {
    const course = dropped[term][index];
    if (!course) return;
    e.dataTransfer.setData("dragInfo", JSON.stringify({ term, index, course }));
  };

  const allowDrop = (term) => (e) => {
    e.preventDefault();
    if (termIndices[term] < earliestInProgressIndex) e.dataTransfer.dropEffect = "none";
  };

  const handleDrop = (targetTerm, e) => {
    e.preventDefault();
    if (termIndices[targetTerm] < earliestInProgressIndex) return;

    let dragInfo;
    try {
      dragInfo = e.dataTransfer.getData("dragInfo")
        ? JSON.parse(e.dataTransfer.getData("dragInfo"))
        : JSON.parse(e.dataTransfer.getData("application/json"));
    } catch {
      dragInfo = null;
    }
    if (!dragInfo) return;

    setDropped(prev => {
      const updated = { ...prev };
      for (let t of terms) updated[t] = [...prev[t]];

      if (dragInfo.code && !dragInfo.term) {
        const course = dragInfo;
        updated[targetTerm].push({
          ...course,
          title: course.name || course.title || "",
          credit: course.units || course.credit || "",
          status: "Planned",
        });
        return updated;
      }

      const { term: sourceTerm, index: sourceIndex, course } = dragInfo;
      updated[targetTerm].push(course);
      updated[sourceTerm].splice(sourceIndex, 1);
      return updated;
    });
  };

  const handleDelete = (term, index) => {
    setDropped(prev => {
      const updated = { ...prev };
      updated[term] = [...prev[term]];
      updated[term].splice(index, 1);
      return updated;
    });
  };

  const getCourseColorClasses = (status) => {
    switch (status) {
      case "Completed": return "bg-[#1ECB7433] outline-[#1ECB74]";
      case "In Progress": return "bg-[#2C97D733] outline-[#2C97D7]";
      default: return "bg-white outline-black/20 hover:bg-gray-50";
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Year Header */}
      <div className="p-3.5 bg-[#A6192E] outline outline-1 outline-white flex justify-between items-center">
        <div className="text-white text-xl font-bold">{yearLabel}</div>
        <div className="text-white text-xl font-bold">Units: {yearUnits}</div>
      </div>

      {/* Terms */}
      <div className="flex gap-4 w-full">
        {terms.map((term, termIdx) => {
          const displayYear = term === "Fall" ? yearLabel.split(" – ")[0] : yearLabel.split(" – ")[1];
          const droppable = termIdx >= earliestInProgressIndex;

          return (
            <div key={term} className="flex flex-col flex-grow min-w-0" style={{ flexBasis: 0 }}>
              {/* Term Header */}
              <div className="h-10 p-2.5 outline outline-1 outline-black flex justify-between items-center">
                <div className="text-black text-xl font-semibold">{term} {displayYear}</div>
                <div className="text-black text-base font-semibold">Units: {termUnits[term]}</div>
              </div>

              {/* Course List */}
              <div
                className="pt-2.5 flex flex-col gap-[5px]"
                onDrop={(e) => droppable && handleDrop(term, e)}
                onDragOver={allowDrop(term)}
              >
                {(dropped[term] || []).map((course, i) => (
                  <div
                    key={i}
                    draggable={droppable}
                    onDragStart={(e) => handleDragStart(term, i, e)}
                    className={`min-h-[56px] px-2.5 py-1.5 rounded-[5px] outline outline-1 flex flex-col justify-center items-start overflow-hidden transition-colors relative
                      ${getCourseColorClasses(course.status)} ${droppable ? "cursor-move" : ""}`}
                  >
                    <div className="w-full flex justify-between items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-black text-base font-normal truncate">
                          <span className="font-semibold">{course.code}</span> - {course.title}
                        </div>
                      </div>

                      {droppable && (
                        <button
                          onClick={() => handleDelete(term, i)}
                          className="flex-shrink-0 ml-1 text-gray-400 hover:text-black text-sm font-bold transition"
                          aria-label="Delete course"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {course.credit != null && (
                      <div className="px-1.5 py-0.5 rounded-[10px] outline outline-[0.5px] outline-black text-xs font-medium mt-1.5">
                        Units: {Number(course.credit).toFixed(1)}
                      </div>
                    )}
                  </div>
                ))}

                {/* Single "Drop course here" only for allowed semesters */}
                {droppable && (
                  <div
                    className="min-h-[56px] px-2.5 py-1.5 rounded-[5px] border border-dashed border-black/20 flex flex-col justify-center items-center transition-colors bg-gray-50 hover:bg-gray-100 cursor-pointer"
                  >
                    <span className="text-black text-xs font-semibold">Drop course here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
