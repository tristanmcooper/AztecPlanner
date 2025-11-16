import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { sdsuReq } from "./assets/sdsuReq";
import { prompts } from "./assets/prompts";
import roadmapText from "./assets/roadmap.txt?raw";

// ---------- small helpers ----------

function tryParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function normalizeCourseItem(courseLike, idx) {
  const course = courseLike || {};
  const id = course.code ? `${course.code}-${idx}` : course.id ?? idx;

  const code = course.code || "";
  const name =
    course.name || course.title || course.course || `Option ${idx + 1}`;
  const title = `${code} ${name}`.trim();

  const metaParts = [];
  if (course.units) metaParts.push(`${course.units} units`);
  if (course.typically_offered) metaParts.push(course.typically_offered);

  if (Array.isArray(course.professors) && course.professors.length > 0) {
    const qualities = course.professors
      .map((p) =>
        typeof p.overall_quality === "number"
          ? p.overall_quality
          : parseFloat(p.overall_quality)
      )
      .filter((x) => !Number.isNaN(x));
    if (qualities.length) {
      const avg =
        qualities.reduce((a, b) => a + b, 0) / qualities.length;
      metaParts.push(`Avg RMP ${avg.toFixed(1)}/5`);
    }
  }

  return {
    id,
    raw: JSON.stringify(course),
    title,
    meta: metaParts.join(" · "),
    text: title,
    course,
  };
}

export default function SemesterPlanner({
  degreeData,
  priorReq,
  todoReq,
  userInfo,
}) {
  const location = useLocation();
  const effectiveDegreeData =
    degreeData ?? (location && location.state && location.state.degreeData) ?? null;
  const effectivePriorReq =
    priorReq ?? (location && location.state && location.state.priorReq) ?? null;
  const effectiveTodoReq =
    todoReq ?? (location && location.state && location.state.todoReq) ?? null;
  const effectiveUserInfo =
    userInfo ?? (location && location.state && location.state.userInfo) ?? null;

  const findSemester = (degreeDataInput) => {
    const dd = degreeDataInput ?? effectiveDegreeData;
    if (!dd || typeof dd !== "object") return null;

    const termOrder = ["Fall", "Spring", "Summer"];
    const years = Object.keys(dd).sort((a, b) => Number(a) - Number(b));

    for (const year of years) {
      const yearObj = dd[year] || {};
      for (const term of termOrder) {
        if (!Object.prototype.hasOwnProperty.call(yearObj, term)) continue;
        const classes = Array.isArray(yearObj[term]) ? yearObj[term] : [];

        if (classes.length === 0) return `${year} ${term}`;

        const allNotInProgressOrCompleted = classes.every((cls) => {
          const status =
            cls && cls.status ? String(cls.status).trim().toLowerCase() : "";
          return (
            status !== "completed" &&
            status !== "in progress" &&
            status !== "inprogress" &&
            status !== "in_progress"
          );
        });

        if (allNotInProgressOrCompleted) return `${year} ${term}`;
      }
    }

    return null;
  };

  const userName =
    effectiveUserInfo && effectiveUserInfo.firstName
      ? effectiveUserInfo.firstName
      : "Student";
  const startPrompt =
    (prompts && prompts.START
      ? String(prompts.START).replace("{name}", userName)
      : `Hi ${userName}, we'll start planning out a semester of your choosing`);
  const calculateReqsPrompt =
    (prompts && prompts.CALCULATE_REQS
      ? String(prompts.CALCULATE_REQS)
      : "We have looked at the requirements you've completed so far, consulted the SDSU CS requirements and roadmap, and determined the requirements you need to take next.");
  const suggestCoursesPrompt =
    (prompts && prompts.SUGGEST_COURSES
      ? String(prompts.SUGGEST_COURSES)
      : "Consulting the SDSU course catalog + rateMyProfessor data to find the best rated courses that fit the requirement");
  const confirmPrompt =
    (prompts && prompts.CONFIRM
      ? String(prompts.CONFIRM)
      : "Now click the confirm button to add these courses to your plan!");

  // LLM state
  const [llmResponse, setLlmResponse] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState(null);
  const [llmItems, setLlmItems] = useState([]);
  const [selectedLlmItem, setSelectedLlmItem] = useState(null);

  // requirement -> { classes: [], selectedClass }
  const [targetedReqs, setTargetedReqs] = useState({});

  // RAG state
  const [ragResponse, setRagResponse] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState(null);
  const [ragItems, setRagItems] = useState([]);
  const [selectedRagItem, setSelectedRagItem] = useState(null);

  const SYSTEM_PROMPT =
    "You are an academic planning assistant. Using ONLY the provided requirements and roadmap, produce a list of 6 requirements (including duplicates) to target this coming semester. Only return the list of targeted requirements, as in the name of each category the student should focus on. Do not include any additional text or explanation.";

  // --------- LLM: pick requirements ---------

  const callLLM = async () => {
    setLlmError(null);
    setLlmResponse(null);
    setLlmItems([]);
    setSelectedLlmItem(null);
    setLlmLoading(true);

    try {
      const payloadMessage = [
        "--- SDSU Requirements (sdsuReq) ---",
        JSON.stringify(sdsuReq || {}, null, 2),
        "\n--- Prior Requirements (priorReq) ---",
        JSON.stringify(effectivePriorReq || {}, null, 2),
        "\n--- Todo Requirements (todoReq) ---",
        JSON.stringify(effectiveTodoReq || {}, null, 2),
        "\n--- Roadmap ---",
        String(roadmapText || ""),
      ].join("\n\n");

      const resp = await fetch("http://127.0.0.1:8000/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_prompt: SYSTEM_PROMPT,
          message: payloadMessage,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`LLM request failed: ${resp.status} ${text}`);
      }

      const data = await resp.json();
      const replyText = data.reply ?? JSON.stringify(data);
      setLlmResponse(replyText);

      const lines = String(replyText)
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const cleaned = lines.map((line, idx) => {
        const cleanedLine = line.replace(/^[-\u2022\s\d\)\.\(]+/, "").trim();
        return { id: idx, text: cleanedLine };
      });
      setLlmItems(cleaned);
    } catch (err) {
      setLlmError(String(err));
    } finally {
      setLlmLoading(false);
    }
  };

  // --------- RAG: suggest courses for a requirement ---------

  const callRag = async (text, reqId = null) => {
    setRagError(null);
    setRagResponse(null);
    setRagItems([]);
    setSelectedRagItem(null);
    setRagLoading(true);

    try {
      const basePrompt =
        "You are an academic planning assistant. Based on the following requirement to target this semester, suggest specific courses from the SDSU course catalog that fulfill these requirements and have a high rating on RateMyProfessor. Return ONLY a JSON array of courses. Each course should be a JSON object, not a string.\n\n";
      const message =
        basePrompt +
        String(text || "") +
        "\n\n" +
        JSON.stringify(sdsuReq || {}, null, 2);

      const resp = await fetch("http://127.0.0.1:8000/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`RAG request failed: ${resp.status} ${txt}`);
      }

      const data = await resp.json();
      let items = [];

      // 1) If backend already returns an array of course objects
      if (Array.isArray(data)) {
        items = data;
      }

      // 2) Common keyed shapes: { courses: [...] } or { items: [...] }
      if (!items.length && data && Array.isArray(data.courses)) {
        items = data.courses;
      }
      if (!items.length && data && Array.isArray(data.items)) {
        items = data.items;
      }

      // 3) Our current shape: { reply: '["{...}", "{...}", ...]' }
      if (
        !items.length &&
        data &&
        typeof data.reply === "string"
      ) {
        const parsedOuter = tryParseJSON(data.reply);
        if (Array.isArray(parsedOuter)) {
          // Could be array of strings or array of objects
          const maybeObjects = parsedOuter
            .map((elem) =>
              typeof elem === "string" ? tryParseJSON(elem) || elem : elem
            )
            .filter(Boolean);
          const objectOnly = maybeObjects.filter(
            (v) => typeof v === "object"
          );
          items = objectOnly.length ? objectOnly : maybeObjects;
        }
      }

      // 4) If data itself is a JSON string of an array
      if (!items.length && typeof data === "string") {
        const parsed = tryParseJSON(data);
        if (Array.isArray(parsed)) items = parsed;
      }

      // 5) If we still have nothing structured, fall back to text splitting
      if (!items.length) {
        const replyText =
          (data && data.reply) ? String(data.reply) : JSON.stringify(data);
        setRagResponse(replyText);

        const lines = String(replyText)
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        items = lines.map((line, idx) => {
          const cleanedLine = line
            .replace(/^[-\u2022\s\d\)\.\(]+/, "")
            .trim();
          const parts = cleanedLine.split(/\s+-\s+|:|\|/);
          const title = parts[0].trim() || `Option ${idx + 1}`;
          const meta = parts.slice(1).join(" - ").trim();
          return {
            id: idx,
            raw: line,
            title,
            meta,
            text: cleanedLine,
          };
        });
      }

      // Normalize everything to course cards
      const normalized = items.map((it, idx) => {
        if (typeof it === "string") {
          // try to parse as JSON course first
          const maybeCourse = tryParseJSON(it);
          if (maybeCourse && typeof maybeCourse === "object") {
            return normalizeCourseItem(maybeCourse, idx);
          }
          const cleanedLine = it
            .replace(/^[-\u2022\s\d\)\.\(]+/, "")
            .trim();
          const parts = cleanedLine.split(/\s+-\s+|:|\|/);
          return {
            id: idx,
            raw: it,
            title: parts[0].trim() || `Option ${idx + 1}`,
            meta: parts.slice(1).join(" - ").trim(),
            text: cleanedLine,
            course: null,
          };
        }

        // treat any object as a course-like thing
        return normalizeCourseItem(it, idx);
      });

      setRagItems(normalized);

      if (reqId !== null) {
        setTargetedReqs((prev) => ({
          ...prev,
          [reqId]: {
            ...(prev[reqId] || {}),
            classes: normalized,
            selectedClass:
              prev[reqId] && prev[reqId].selectedClass
                ? prev[reqId].selectedClass
                : null,
          },
        }));
      }
    } catch (err) {
      setRagError(String(err));
    } finally {
      setRagLoading(false);
    }
  };

  const handleSelectRagItem = (item) => {
    if (!item) return;
    setSelectedRagItem(item);

    if (selectedLlmItem) {
      setTargetedReqs((prev) => ({
        ...prev,
        [selectedLlmItem.id]: {
          ...(prev[selectedLlmItem.id] || {}),
          classes:
            prev[selectedLlmItem.id] &&
            prev[selectedLlmItem.id].classes &&
            prev[selectedLlmItem.id].classes.length
              ? prev[selectedLlmItem.id].classes
              : ragItems,
          selectedClass: item,
        },
      }));

      setLlmItems((prev) =>
        prev.map((it) =>
          it.id === selectedLlmItem.id ? { ...it, completed: true } : it
        )
      );
    }

    // keep ragItems visible; show a short confirmation string
    setRagResponse(
      `Selected ${item.course?.code ?? ""} ${
        item.course?.name ?? item.text
      } for this requirement.`
    );
  };

  const handleSelectItem = async (item) => {
    if (!item) return;
    setSelectedLlmItem(item);

    const saved = targetedReqs && targetedReqs[item.id];
    if (saved && Array.isArray(saved.classes) && saved.classes.length > 0) {
      setRagItems(saved.classes);
      setRagResponse(
        `Loaded ${saved.classes.length} saved courses for this requirement.`
      );
      return;
    }

    await callRag(item.text, item.id);
  };

  useEffect(() => {
    console.log("Username for prompt:", userName);
    console.log(effectiveUserInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasConfirmedAny =
    Object.values(targetedReqs).some(
      (r) => r && r.selectedClass
    );

  return (
    <div style={{ paddingTop: 72 }} className="px-4 pb-8">
      <h1 className="text-2xl font-bold mb-2">Semester Planner</h1>
      <p className="text-sm text-gray-700 mb-4">
        This is the Semester Planner page.
      </p>

      <div className="mb-4 text-sm text-gray-800">{startPrompt}</div>
      <p className="text-xs text-gray-500 mb-1">
        Finding your soonest unplanned semester...
      </p>
      <div className="text-sm mb-4">
        Next semester to plan:{" "}
        <span className="font-semibold">
          {findSemester(effectiveDegreeData) || "N/A"}
        </span>
      </div>

      <div className="mb-4">
        <button
          onClick={callLLM}
          disabled={llmLoading}
          className="px-4 py-2 rounded bg-[#A6192E] text-white text-sm disabled:opacity-60"
        >
          {llmLoading ? "Thinking..." : "Ask LLM for a semester plan"}
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-1">
        Looking at your completed courses, major requirements and SDSU
        roadmap to determine what requirements you should target this
        semester...
      </p>
      <div className="text-sm text-gray-800 mb-3">
        {calculateReqsPrompt}
      </div>

      <div className="mb-6">
        {llmError && (
          <div className="text-red-600 text-sm mb-2">Error: {llmError}</div>
        )}

        {llmItems && llmItems.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Choose a requirement to explore
            </h3>
            <div className="space-y-2">
              {llmItems.map((item) => {
                const hasSelectedClass =
                  targetedReqs &&
                  targetedReqs[item.id] &&
                  targetedReqs[item.id].selectedClass;
                const isActive =
                  selectedLlmItem && selectedLlmItem.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    disabled={ragLoading || !!hasSelectedClass}
                    className={`w-full text-left px-3 py-2 rounded border text-sm transition
                      ${
                        isActive
                          ? "border-[#A6192E] bg-[#A6192E]/5"
                          : "border-gray-200 bg-white hover:border-black"
                      }
                      ${hasSelectedClass ? "opacity-70" : ""}`}
                  >
                    {hasSelectedClass ? "✓ " : ""}
                    {item.text}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          llmResponse && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">LLM Response</h3>
              <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-200">
                {llmResponse}
              </pre>
            </div>
          )
        )}
      </div>

      <div className="text-sm text-gray-800 mb-2">
        {suggestCoursesPrompt}
      </div>

      <div className="mb-4">
        {ragError && (
          <div className="text-red-600 text-sm mb-2">Error: {ragError}</div>
        )}
        {ragLoading && (
          <div className="text-sm text-gray-500 mb-2">
            Loading course suggestions...
          </div>
        )}

        {ragItems && ragItems.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Suggested Courses
            </h3>
            <div className="space-y-2">
              {ragItems.map((item) => {
                const isSelected =
                  selectedRagItem && selectedRagItem.id === item.id;
                const c = item.course || {};
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectRagItem(item)}
                    className={`cursor-pointer border rounded-xl p-3 text-sm transition
                      ${
                        isSelected
                          ? "border-[#A6192E] bg-[#A6192E]/5"
                          : "border-gray-200 bg-gray-50 hover:border-black"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {item.meta}
                        </div>
                      </div>
                    </div>
                    {c.description && (
                      <p className="text-xs text-gray-700 mt-2 line-clamp-3">
                        {c.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {ragResponse && (
              <p className="mt-2 text-xs text-gray-600">{ragResponse}</p>
            )}
          </div>
        ) : (
          ragResponse && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold mb-1">RAG Response</h3>
              <pre className="text-xs whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-200">
                {ragResponse}
              </pre>
            </div>
          )
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-800 mb-2">{confirmPrompt}</p>
        <button
          type="button"
          disabled={!hasConfirmedAny}
          onClick={() => {
            console.log("Confirmed targetedReqs:", targetedReqs);
            alert(
              "Confirm clicked. (Wire this up to your planner when ready.)"
            );
          }}
          className="px-4 py-2 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Confirm selected courses
        </button>
      </div>
    </div>
  );
}
