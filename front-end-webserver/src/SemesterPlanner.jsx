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

    // LLM UI state
    const [llmResponse, setLlmResponse] = useState(null);
    const [llmLoading, setLlmLoading] = useState(false);
    const [llmError, setLlmError] = useState(null);

    const SYSTEM_PROMPT = "You are an academic planning assistant. Using ONLY the provided requirements and roadmap, produce a list of 6 requirements (including duplicates) to target this coming semester. Only Return the list of targeted requirements, as in the name of the each category the student should focus on. Do not include any additional text or explanation.";

    const callLLM = async () => {
        setLlmError(null);
        setLlmResponse(null);
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
            setLlmResponse(data.reply ?? JSON.stringify(data));
        } catch (err) {
            setLlmError(String(err));
        } finally {
            setLlmLoading(false);
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
            
             <div style={{ marginTop: 12 }}>
                {llmError && <div style={{ color: 'red' }}>Error: {llmError}</div>}
                {llmResponse && (
                    <div>
                        <h3>LLM Response</h3>
                        <pre style={{ whiteSpace: 'pre-wrap' }}>{llmResponse}</pre>
                    </div>
                )}
            </div>

        </div>
    );
}