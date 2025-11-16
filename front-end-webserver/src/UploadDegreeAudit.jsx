import { useState, useRef } from "react";
import { sdsuReq } from "./assets/sdsuReq.js";
import classDataJSON from "./assets/classData.json";
import { useNavigate } from "react-router-dom";

export default function UploadDegreeAudit() {
  const [courses, setDegreeData] = useState([]);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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

        // Construct data
        const degreeData = constructDegreeData(extractedCourses);
        const userReq = constructUserReq(degreeData);
        const priorReq = constructPriorReq(userReq, sdsuReq);
        const todoReq = constructTodoReq(priorReq);
        const classData = constructClassArray(classDataJSON);

        // ✅ Navigate to planner with all processed data
        navigate("/planner", {
          state: { degreeData, userReq, priorReq, todoReq, classData },
        });
      };
      reader.readAsText(uploadedFile);
    } else {
      alert("Please select a valid HTML file");
    }
  };

  // Helper functions unchanged...
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
    <main className="mx-auto max-w-[1280px] px-4" role="main">

      {/* Back Arrow */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-20 left-4 text-3xl text-gray-900 hover:text-black"
        aria-label="Go back to landing page"
      >
        ←
      </button>

      {/* Heading + subtitle */}
      <section className="text-center mt-28">
        <h2 className="text-5xl font-bold text-black mb-6 mt-12 text-center">
          Upload Degree Audit
        </h2>
        <p className="mt-9 text-lg sm:text-xl max-w-3xl mx-auto font-medium">
          Upload your SDSU Degree Audit as an HTML file to get started.
        </p>
      </section>

      {/* Upload Box */}
      <div
        className="w-full max-w-[675px] aspect-[675/302] border-2 border-dashed border-black rounded-lg flex flex-col items-center justify-center text-center mx-auto mt-6 relative cursor-pointer transition hover:bg-gray-100"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && file.type === "text/html") {
            const event = { target: { files: [file] } };
            handleFileChange(event);
          } else {
            alert("Please drop a valid HTML file");
          }
        }}
      >
        <p className="text-2xl text-black font-normal pointer-events-none">
          Drag & drop file here <br /> or{" "}
          <span className="text-[#A6192E] underline">Choose File</span> to upload
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".html"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </main>
  );
}