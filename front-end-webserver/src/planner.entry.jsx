import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Planner from "./planner";
import "./index.css";

const rootEl = document.getElementById("root");
if (rootEl && rootEl.childElementCount === 0) {
  createRoot(rootEl).render(
    <StrictMode>
      <Planner />
    </StrictMode>,
  );
}

// Export nothing — this file is an entry point used by planner.html
