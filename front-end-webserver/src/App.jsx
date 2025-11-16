import { useRef, useState } from "react";
import Navbar from "./Navbar";
import LandingHero from "./LandingHero";
import "./index.css";

export default function App() {
  const [courses, setCourses] = useState([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile && uploadedFile.type === "text/html") {
      setFileName(uploadedFile.name); // store file name

      const reader = new FileReader();
      reader.onload = (e) => {
        const htmlText = e.target.result;

        // Parse HTML into DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        // Find all rows in the completedCourses table
        const rows = doc.querySelectorAll("table.completedCourses tr.takenCourse");
        const extractedCourses = [];
        rows.forEach((row) => {
          const term = row.querySelector("td.term")?.textContent.trim();
          const course = row.querySelector("td.course")?.textContent.trim();
          const credit = row.querySelector("td.credit")?.textContent.trim();
          const grade = row.querySelector("td.grade")?.textContent.trim();
          const description = row
            .querySelector("td.description td.descLine")
            ?.textContent.trim();
          extractedCourses.push({ term, course, credit, grade, description });
        });
        setCourses(extractedCourses);
      };
      reader.readAsText(uploadedFile);
    } else {
      alert("Please select a valid HTML file");
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const startFromScratch = () => {
    document.getElementById("uploader-card")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Navbar onOpenTutorial={() => alert("Show tutorial modal")} />

      {/* Landing Hero handles both main buttons */}
      <LandingHero
        onUploadClick={triggerUpload}
        onStartFromScratch={startFromScratch}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Course data display */}
      <div id="uploader-card" className="mx-auto max-w-xl px-4 py-10">
        <div className="bg-white p-6 rounded-lg shadow-md w-full flex flex-col gap-4 border">
          {fileName && (
            <p className="text-gray-700 font-medium">
              Selected file: {fileName}
            </p>
          )}

          {courses.length > 0 && (
            <div className="mt-2 space-y-2">
              {courses.map((c, i) => (
                <div key={i} className="p-2 border rounded bg-gray-50">
                  <p><strong>Term:</strong> {c.term}</p>
                  <p><strong>Course:</strong> {c.course}</p>
                  <p><strong>Credit:</strong> {c.credit}</p>
                  <p><strong>Grade:</strong> {c.grade}</p>
                  <p><strong>Description:</strong> {c.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}