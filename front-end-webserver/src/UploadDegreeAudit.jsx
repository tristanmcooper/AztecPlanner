import { useState, useRef } from "react";
import { sdsuReq } from "./assets/sdsuReq.js";
import classDataJSON from "./assets/classData.json";

export default function UploadDegreeAudit() {
  const [courses, setDegreeData] = useState([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile && uploadedFile.type === "text/html") {
      setFileName(uploadedFile.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        const htmlText = e.target.result;

        // Parse HTML into DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        const rows = doc.querySelectorAll("table.completedCourses tr.takenCourse");
        const extractedCourses = [];
        rows.forEach((row) => {
          const termEl = row.querySelector("td.term");
          const term = termEl?.textContent.trim();

          if (!term) return;

          const code = row.querySelector("td.course")?.textContent.trim();
          if (!code) return;
          const alreadyExists = extractedCourses.some(c => c.code === code);
          if (alreadyExists) return;

          const title = row.querySelector("td.description td.descLine")?.textContent.trim();
          const credit = row.querySelector("td.credit")?.textContent.trim();
          const grade = row.querySelector("td.grade")?.textContent.trim();
          const status = (grade === "IP") ? "In Progress" : "Completed";
          extractedCourses.push({ term, code, title, credit, grade, status });
        });
        setDegreeData(extractedCourses);

        // DEBUG
        const degreeData = constructDegreeData(extractedCourses);
        console.log("Constructed Degree Data:", degreeData);

        const userReq = constructUserReq(degreeData);
        console.log("Constructed User Requirements:", userReq);

        const priorReq = constructPriorReq(userReq, sdsuReq);
        console.log("Constructed Prior Requirement Summary:", priorReq);

        const todoReq = constructTodoReq(priorReq);
        console.log("Constructed Todo Requirements:", todoReq);

        const classData = constructClassArray(classDataJSON);
        console.log("Class Data Array:", classData);
      };
      reader.readAsText(uploadedFile);
    } else {
      alert("Please select a valid HTML file");
    }
  };

  // Helper functions moved here
  const constructDegreeData = (courses) => {
    const data = {};
    courses.forEach((c) => {
      const semMatch = c.term.match(/([A-Z]+)(\d{2})/);
      if (!semMatch) return;
      const semester = semMatch[1];
      const year = `20${semMatch[2]}`;
      const academicYear = semester === "FA" ? parseInt(year) : parseInt(year) - 1;

      if (semester === "FA") c.term = "Fall";
      else if (semester === "SP") c.term = "Spring";
      else if (semester === "SU") c.term = "Summer";

      if (!data[academicYear]) data[academicYear] = {};
      if (!data[academicYear][c.term]) data[academicYear][c.term] = [];

      data[academicYear][c.term].push({
        code: c.code,
        title: c.title,
        credit: c.credit,
        grade: c.grade,
        status: c.status,
      });
    });

    if (!data["2025"]) data["2025"] = {};
    if (!data["2025"]["Spring"]) data["2025"]["Spring"] = [];

    data["2025"]["Spring"].push({
      code: "ANTH 331",
      title: "Dummy",
      credit: "3.0",
      grade: "",
      status: "Planned"
    });

    return data;
  };

  const constructUserReq = (degreeData) => {
    const userReq = {};
    Object.entries(sdsuReq).forEach(([reqKey, req]) => {
      userReq[reqKey] = [];
      const allClasses = [];
      if (req.class_codes) allClasses.push(...req.class_codes);
      if (req.subarea) {
        Object.values(req.subarea).forEach(subArr => allClasses.push(...subArr));
      }
      Object.values(degreeData).forEach(semesters => {
        Object.values(semesters).forEach(classes => {
          classes.forEach(cls => {
            const normalizeCode = (code) => code.replace(/\s+/g, " ").trim().toUpperCase();
            const allClassesNormalized = allClasses.map(normalizeCode);
            if (allClassesNormalized.includes(normalizeCode(cls.code)) && (cls.status === "Completed" || cls.status === "In Progress")) {
              userReq[reqKey].push(cls);
            }
          });
        });
      });
    });
    return userReq;
  };

  const constructPriorReq = (userReq, sdsuReq) => {
    const priorReq = {};
    Object.entries(userReq).forEach(([reqKey, classes]) => {
      const completedCount = classes.filter(c => c.status === "Completed").length;
      const target = sdsuReq[reqKey]?.class_num_min || 0;
      priorReq[reqKey] = {
        name: sdsuReq[reqKey]?.name || reqKey,
        completed: completedCount,
        target: target,
      };
    });
    return priorReq;
  };

  const constructTodoReq = (priorReq) => {
    const todoReq = {};
    Object.entries(priorReq).forEach(([reqKey, req]) => {
      const remaining = Math.max(req.target - req.completed, 0);
      todoReq[reqKey] = {
        name: req.name,
        classesToFinish: remaining,
      };
    });
    return todoReq;
  };

  const constructClassArray = (courses) => {
    return courses.map((c) => ({
      code: c.code,
      name: c.name,
      units: c.units,
      typically_offered: c.typically_offered,
      prereqs: (!c.prereqs) ? "No Prerequisites" : c.prereqs
    }));
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Upload Your Degree Audit</h1>
      <div className="bg-white p-6 rounded-lg shadow-md w-full flex flex-col gap-4 border">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Choose File
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".html"
          onChange={handleFileChange}
          className="hidden"
        />

        {fileName && (
          <p className="text-gray-700 font-medium">Selected file: {fileName}</p>
        )}

        {courses.length > 0 && (
          <div className="mt-2 space-y-2">
            {courses.map((c, i) => (
              <div key={i} className="p-2 border rounded bg-gray-50">
                <p><strong>Term:</strong> {c.term}</p>
                <p><strong>Course:</strong> {c.code}</p>
                <p><strong>Title:</strong> {c.title}</p>
                <p><strong>Credit:</strong> {c.credit}</p>
                <p><strong>Grade:</strong> {c.grade}</p>
                <p><strong>Status:</strong> {c.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}