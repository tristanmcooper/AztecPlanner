import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Navbar from "./Navbar";
import CourseSearch from "./CourseSearch";
import AIAssistant from "./AIAssistant";
import "./index.css";

export default function Planner() {
  return (
    <>
      <Navbar />

      <div className="flex gap-4 items-start">
        <main className="flex-1 p-4">
          {/* Existing planner content goes here. Keep current layout and widgets. */}
          <div className="bg-white border rounded p-4">Main planner content (drag/drop planner UI)</div>
        </main>

        <aside className=" w-1/3 shrink-0">
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
    </>
  );
}

// If this file is loaded directly by planner.html as the entry script,
// mount the Planner component into the page's #root element.
const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <Planner />
    </StrictMode>,
  );
}