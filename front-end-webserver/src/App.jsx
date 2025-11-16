import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import LandingHero from "./LandingHero";
import "./index.css";
import UploadDegreeAudit from "./UploadDegreeAudit.jsx";
import PlanFromScratch from "./PlanFromScratch.jsx";
import Planner from "./Planner.jsx";

function LandingPage() {
  const navigate = useNavigate();

  const handleUploadClick = () => {
    navigate("/upload");
  };

  const handleStartFromScratch = () => {
    navigate("/plan");
  };

  return (
    <>
    <div className="mt-16">
      <LandingHero
        onUploadClick={handleUploadClick}
        onStartFromScratch={handleStartFromScratch}
      />
    </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar onOpenTutorial={() => alert("Show tutorial modal")} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadDegreeAudit />} />
        <Route path="/plan" element={<PlanFromScratch />} />
        <Route path="/planner" element={<Planner />} />
      </Routes>
    </Router>
  );
}