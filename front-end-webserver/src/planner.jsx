import { useLocation } from "react-router-dom";
import CourseSearch from "./CourseSearch";
import AIAssistant from "./AIAssistant";
import "./index.css";

export default function Planner() {
  const location = useLocation();
  const { degreeData, userReq, priorReq, todoReq, classData } = location.state || {};

  return (
    <div className="flex gap-4 items-start">
      <main className="flex-1 p-4">
        <div className="bg-white border rounded p-4">
          <h1 className="text-xl font-bold mb-4">Planner</h1>

          {/* ✅ Properly formatted display of uploaded degree data */}
          {degreeData ? (
            <div className="space-y-6">
              {Object.entries(degreeData).map(([year, semesters]) => (
                <div key={year}>
                  <h2 className="text-lg font-semibold mb-2">{year} Academic Year</h2>
                  {Object.entries(semesters).map(([term, classes]) => (
                    <div key={term} className="mb-4 border rounded-lg bg-gray-50 p-3">
                      <h3 className="text-md font-semibold mb-2">{term} Semester</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {classes.map((c, i) => (
                          <div key={i} className="p-2 border rounded bg-white shadow-sm">
                            <p className="font-semibold">{c.code}</p>
                            <p className="text-sm text-gray-700">{c.title}</p>
                            <p className="text-sm"><strong>Credits:</strong> {c.credit}</p>
                            <p className="text-sm"><strong>Grade:</strong> {c.grade}</p>
                            <p className="text-sm"><strong>Status:</strong> {c.status}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p>No degree audit data loaded.</p>
          )}
        </div>
      </main>

      <aside className="w-1/3 shrink-0">
        <div className="sticky top-20 flex flex-col h-[calc(100vh-4rem)]">
          <div className="basis-[40%]">
            <CourseSearch />
          </div>
          <div className="basis-[60%]">
            <AIAssistant />
          </div>
        </div>
      </aside>
    </div>
  );
}