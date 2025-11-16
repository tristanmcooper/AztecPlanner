import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { sdsuReq } from './assets/sdsuReq';
import { prompts } from './assets/prompts';
// Import roadmap text as raw string (Vite supports ?raw imports)
import roadmapText from './assets/roadmap.txt?raw';

export default function SemesterPlanner({ degreeData, priorReq, todoReq, userInfo }) {
    const location = useLocation();
    // Prefer prop if passed, otherwise read from navigation state
    const effectiveDegreeData = degreeData ?? (location && location.state && location.state.degreeData) ?? null;
    const effectivePriorReq = priorReq ?? (location && location.state && location.state.priorReq) ?? null;
    const effectiveTodoReq = todoReq ?? (location && location.state && location.state.todoReq) ?? null;
    const effectiveUserInfo = userInfo ?? (location && location.state && location.state.userInfo) ?? null;

    const findSemester = (degreeDataInput) => {
        const degreeData = degreeDataInput ?? effectiveDegreeData;
        if (!degreeData || typeof degreeData !== 'object') return null;

        // Order to check terms as they appear in the audit (keep Fall, Spring, Summer)
        const termOrder = ['Fall', 'Spring', 'Summer'];

        // Sort years numerically ascending
        const years = Object.keys(degreeData).sort((a, b) => Number(a) - Number(b));

        for (const year of years) {
            const yearObj = degreeData[year] || {};
            for (const term of termOrder) {
                if (!Object.prototype.hasOwnProperty.call(yearObj, term)) continue;
                const classes = Array.isArray(yearObj[term]) ? yearObj[term] : [];

                // If semester has no classes, return as "YYYY Term"
                if (classes.length === 0) return `${year} ${term}`;

                // If every class in the semester has a status that is neither
                // 'In Progress' nor 'Completed', then this semester counts
                const allNotInProgressOrCompleted = classes.every((cls) => {
                    const status = (cls && cls.status) ? String(cls.status).trim().toLowerCase() : '';
                    return status !== 'completed' && status !== 'in progress' && status !== 'inprogress' && status !== 'in_progress';
                });

                if (allNotInProgressOrCompleted) return `${year} ${term}`;
            }
        }

        return null;
    }

    // Build START prompt with user's name (fallback to 'Student')
    const userName = (effectiveUserInfo && effectiveUserInfo.firstName) ? effectiveUserInfo.firstName : 'Student';
    const startPrompt = (prompts && prompts.START) ? String(prompts.START).replace('{name}', userName) : `Hi ${userName}, we'll start planning out a semester of your choosing`;
    const calculateReqsPrompt = prompts && prompts.CALCULATE_REQS ? String(prompts.CALCULATE_REQS) : "We have looked at the requirements you've completed so far, consulted the SDSU CS requirements and roadmap, and detmermined the requirements you need to take next.";
    const suggestCoursesPrompt = prompts && prompts.SUGGEST_COURSES ? String(prompts.SUGGEST_COURSES) : "Consulting the SDSU course catalog + rateMyProfessor data to find the best rated courses that fit the requirement";
    const confirmPrompt = prompts && prompts.CONFIRM ? String(prompts.CONFIRM) : "Now click the confirm button to add these courses to your plan!";
    // LLM UI state
    const [llmResponse, setLlmResponse] = useState(null);
    const [llmLoading, setLlmLoading] = useState(false);
    const [llmError, setLlmError] = useState(null);

    // Parsed LLM items (each line -> clickable item)
    const [llmItems, setLlmItems] = useState([]);
    const [selectedLlmItem, setSelectedLlmItem] = useState(null);
    // Keep targeted requirements mapping: reqId -> { classes: [], selectedClass: null }
    const [targetedReqs, setTargetedReqs] = useState({});
    const [ragResponse, setRagResponse] = useState(null);
    const [ragLoading, setRagLoading] = useState(false);
    const [ragError, setRagError] = useState(null);
    // Parsed RAG items (e.g., suggested courses)
    const [ragItems, setRagItems] = useState([]);
    const [selectedRagItem, setSelectedRagItem] = useState(null);

    const SYSTEM_PROMPT = "You are an academic planning assistant. Using ONLY the provided requirements and roadmap, produce a list of 6 requirements (including duplicates) to target this coming semester. Only Return the list of targeted requirements, as in the name of the each category the student should focus on. Do not include any additional text or explanation.";

    const callLLM = async () => {
        setLlmError(null);
        setLlmResponse(null);
        setLlmItems([]);
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
            ].join('\n\n');

            const resp = await fetch('http://127.0.0.1:8000/llm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ system_prompt: SYSTEM_PROMPT, message: payloadMessage }),
            });

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(`LLM request failed: ${resp.status} ${text}`);
            }

            const data = await resp.json();
            const replyText = data.reply ?? JSON.stringify(data);
            setLlmResponse(replyText);

            // Parse the LLM reply into clickable items (one item per non-empty line)
            try {
                const lines = String(replyText).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                const cleaned = lines.map((line, idx) => {
                    // Remove common leading bullets/numbers like "-", "•", "1.", "1)", "(1)"
                    const cleanedLine = line.replace(/^[-\u2022\s\d\)\.\(]+/, '').trim();
                    return { id: idx, text: cleanedLine };
                });
                setLlmItems(cleaned);
            } catch (err) {
                console.warn('Failed to parse LLM reply into items:', err);
            }
        } catch (err) {
            setLlmError(String(err));
        } finally {
            setLlmLoading(false);
        }
    };

    // Call the RAG endpoint with the provided text message
    // callRag optionally takes a reqId so results can be stored under that requirement
    const callRag = async (text, reqId = null) => {
        setRagError(null);
        setRagResponse(null);
        setRagItems([]);
        setSelectedRagItem(null);
        setRagLoading(true);

        try {
            let prompt = "You are an academic planning assistant. Based on the following requirement to target this semester, suggest specific courses from the SDSU course catalog that fulfill these requirements and have a high rating on RateMyProfessor. Return the list of suggested courses only, without any additional explanation.\n\n";
            // Build message for RAG call using the selected item text and SDSU requirements
            const message = prompt + String(text || '') + "\n\n" + JSON.stringify(sdsuReq || {}, null, 2);
            const resp = await fetch('http://127.0.0.1:8000/rag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });

            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(`RAG request failed: ${resp.status} ${txt}`);
            }

            const data = await resp.json();

            // If backend returns structured JSON (preferred), use it directly.
            // Support common shapes: array of items, { items: [...] }, { courses: [...] }
            let items = [];
            if (Array.isArray(data)) {
                items = data;
            } else if (data && Array.isArray(data.items)) {
                items = data.items;
            } else if (data && Array.isArray(data.courses)) {
                items = data.courses;
            } else if (data && typeof data === 'object') {
                // If it's an object with top-level keys that look like objects, convert to array
                // e.g., { "0": {..}, "1": {..} }
                const topVals = Object.values(data).filter(v => typeof v === 'object');
                if (topVals.length > 0) items = topVals;
            }

            // If no structured items found, fall back to text parsing from a `reply` field or raw JSON string
            if (items.length === 0) {
                const replyText = (data && data.reply) ? String(data.reply) : JSON.stringify(data);
                setRagResponse(replyText);
                try {
                    const lines = String(replyText).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    items = lines.map((line, idx) => {
                        const cleanedLine = line.replace(/^[-\u2022\s\d\)\.\(]+/, '').trim();
                        const parts = cleanedLine.split(/\s+-\s+|:|\|/);
                        const title = parts[0].trim();
                        const meta = parts.slice(1).join(' - ').trim();
                        return { id: idx, raw: line, title, meta, text: cleanedLine };
                    });
                } catch (err) {
                    console.warn('Failed to parse RAG reply into items:', err);
                }
            }

            // Normalize items to have { id, title, meta, text, raw }
            const normalized = items.map((it, idx) => {
                if (typeof it === 'string') {
                    const cleanedLine = it.replace(/^[-\u2022\s\d\)\.\(]+/, '').trim();
                    const parts = cleanedLine.split(/\s+-\s+|:|\|/);
                    return { id: idx, raw: it, title: parts[0].trim(), meta: parts.slice(1).join(' - ').trim(), text: cleanedLine };
                }
                // If object, map common fields
                return {
                    id: it.id ?? idx,
                    raw: it.raw ?? JSON.stringify(it),
                    title: it.title ?? it.name ?? it.course ?? it.code ?? JSON.stringify(it),
                    meta: it.meta ?? it.professor ?? it.info ?? '',
                    text: it.text ?? it.title ?? it.name ?? JSON.stringify(it),
                };
            });

            setRagItems(normalized);

            // If reqId provided, store classes under targetedReqs so we can reuse without requerying
            if (reqId !== null) {
                setTargetedReqs((prev) => ({
                    ...prev,
                    [reqId]: {
                        ...(prev[reqId] || {}),
                        classes: normalized,
                        // keep previously selected class if any
                        selectedClass: (prev[reqId] && prev[reqId].selectedClass) ? prev[reqId].selectedClass : null,
                    }
                }));
            }
        } catch (err) {
            setRagError(String(err));
        } finally {
            setRagLoading(false);
        }
    };

    // When a RAG item is selected, mark it visually and mark the corresponding LLM item as completed
    const handleSelectRagItem = (item) => {
        if (!item) return;
        setSelectedRagItem(item);

        // Mark the currently selected LLM item as completed
        if (selectedLlmItem) {
            // Update targetedReqs: set selectedClass for this requirement
            setTargetedReqs((prev) => ({
                ...prev,
                [selectedLlmItem.id]: {
                    ...(prev[selectedLlmItem.id] || {}),
                    classes: prev[selectedLlmItem.id] && prev[selectedLlmItem.id].classes ? prev[selectedLlmItem.id].classes : ragItems,
                    selectedClass: item,
                }
            }));

            // Mark in llmItems as completed
            setLlmItems((prev) => prev.map((it) => it.id === selectedLlmItem.id ? { ...it, completed: true } : it));
        }

        // Optionally clear the rag items (collapse RAG list) and keep a short confirmation in ragResponse
        setRagItems([]);
        setRagResponse(`Selected: ${item.text}`);
    };

    // Handle when a parsed LLM item is clicked
    const handleSelectItem = async (item) => {
        if (!item) return;
        setSelectedLlmItem(item);

        // If we already have classes for this requirement, reuse them instead of requerying
        const saved = targetedReqs && targetedReqs[item.id];
        if (saved && Array.isArray(saved.classes) && saved.classes.length > 0) {
            setRagItems(saved.classes);
            setRagResponse(`Loaded ${saved.classes.length} saved classes for this requirement.`);
            return;
        }

        try {
            await callRag(item.text, item.id);
        } catch (err) {
            console.warn('RAG call failed on item select:', err);
        }
    };

    // Log user info once when component mounts (avoid render-side logging)
    useEffect(() => {
        console.log('Username for prompt:', userName);
        console.log(effectiveUserInfo);
    // Intentionally only run on mount/unmount; note React Strict Mode may mount twice in dev
    }, []);
    return (
        <div style={{ paddingTop: 72 }}>
            <h1>Semester Planner</h1>
            <p>This is the Semester Planner page.</p>
            
            <div>{startPrompt}</div>
            <loading-text> Finding your soonest unplanned semester...</loading-text>
            <div>Next semester to plan: {findSemester(effectiveDegreeData) || 'N/A'}</div>
            <div style={{ marginTop: 16 }}>
                <button onClick={callLLM} disabled={llmLoading}>
                    {llmLoading ? 'Thinking...' : 'Ask LLM for a semester plan'}
                </button>
            </div>
           
            <loading-text> Looking at your completed courses, major requirements and SDSU roadmap
                to determine what requirements you should target this semester...</loading-text>
            <div>{calculateReqsPrompt}</div>
             <div style={{ marginTop: 12 }}>
                {llmError && <div style={{ color: 'red' }}>Error: {llmError}</div>}
                {llmItems && llmItems.length > 0 ? (
                    <div>
                        <h3>Choose a requirement to explore</h3>
                        <div>
                            {llmItems.map((item) => {
                                const hasSelectedClass = targetedReqs && targetedReqs[item.id] && targetedReqs[item.id].selectedClass;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectItem(item)}
                                        disabled={ragLoading || !!hasSelectedClass}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '8px',
                                            margin: '6px 0',
                                            background: selectedLlmItem && selectedLlmItem.id === item.id ? '#e6f7ff' : undefined,
                                            opacity: hasSelectedClass ? 0.7 : 1,
                                        }}
                                    >
                                        {hasSelectedClass ? '✓ ' : ''}{item.text}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    llmResponse && (
                        <div>
                            <h3>LLM Response</h3>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>{llmResponse}</pre>
                        </div>
                    )
                )}
            </div>
            <div>{suggestCoursesPrompt}</div>
            <loading-text> </loading-text>
            <div style={{ marginTop: 12 }}>
                {ragError && <div style={{ color: 'red' }}>Error: {ragError}</div>}
                {ragLoading && <div>Loading RAG...</div>}

                {ragItems && ragItems.length > 0 ? (
                    <div>
                        <h3>Suggested Courses</h3>
                        <div>
                            {ragItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleSelectRagItem(item)}
                                    style={{
                                        border: selectedRagItem && selectedRagItem.id === item.id ? '2px solid #1890ff' : '1px solid #ccc',
                                        padding: 12,
                                        margin: '8px 0',
                                        cursor: 'pointer',
                                        background: selectedRagItem && selectedRagItem.id === item.id ? '#e6f7ff' : '#f7f7f7',
                                    }}
                                >
                                    <strong>{item.title}</strong>
                                    {item.meta ? <div style={{ fontSize: 12, color: '#444' }}>{item.meta}</div> : null}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    ragResponse && (
                        <div>
                            <h3>RAG Response</h3>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>{ragResponse}</pre>
                        </div>
                    )
                )}
            </div>
            <div>{confirmPrompt}</div>

        </div>
    );
}