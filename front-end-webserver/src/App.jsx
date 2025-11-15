import { useState } from "react";
import "./index.css"; // Tailwind should be imported here

export default function App() {
  const [courses, setCourses] = useState([]);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (event) => {
    console.log("File input changed");
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
          const description = row.querySelector("td.description td.descLine")?.textContent.trim();

          extractedCourses.push({ term, course, credit, grade, description });
        });

        console.log("Extracted courses:", extractedCourses);
        setCourses(extractedCourses); // store courses in state
      };

      reader.readAsText(uploadedFile);
    } else {
      alert("Please select a valid HTML file");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md flex flex-col gap-4">
        <label className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-center">
          Upload HTML File
          <input
            type="file"
            accept=".html"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>

        {fileName && (
          <p className="text-gray-700 font-medium mt-2">Selected file: {fileName}</p>
        )}

        {courses.length > 0 && (
          <div className="mt-2 space-y-2">
            {courses.map((c, i) => (
              <div
                key={i}
                className="p-2 border rounded bg-gray-100"
              >
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
  );
}
