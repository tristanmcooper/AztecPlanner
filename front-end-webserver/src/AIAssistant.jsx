import React, { useState } from "react";

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function sendMessage(e) {
    e && e.preventDefault();
    if (!message) return;
    setLoading(true);
    setError(null);
    const userMsg = message;
    setMessage("");
    setHistory((h) => [...h, { role: "user", text: userMsg }]);
    try {
      // Use the RAG endpoint so the server will retrieve relevant
      // documents and include them in the system prompt for the LLM.
      const resp = await fetch(`http://127.0.0.1:8000/rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!resp.ok) throw new Error(`AI request failed: ${resp.status}`);
      const data = await resp.json();
      const reply = data?.reply ?? "(no response)";
      // Optionally include retrieved documents in the assistant message
      const retrieved = data?.retrieved_documents;
      const assistantText = retrieved && retrieved.length > 0
        ? reply + "\n\nRetrieved documents:\n" + retrieved.join('\n---\n')
        : reply;
      setHistory((h) => [...h, { role: "assistant", text: assistantText }]);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>

      <div className="ai-chat overflow-auto mb-4 flex-1" aria-live="polite">
        {history.length === 0 && (
        <div className="text-gray-500 italic">
            Ask about ... <br></br>
            Dominic Dabish's rateMyprofessor reviews <br></br>
            High rated courses that fulfill a specific degree requirement <br></br>
            Possible substitutions for a course (that still target the same reqs) <br></br>
            Course suggestions based on your interests <br></br>
            What are some classes that cover data structures? <br></br>
        </div>
        )}
        {history.map((h, i) => (
          <div key={i} className={`mb-2`}>
            <div className="text-xs text-gray-500">{h.role === "user" ? "You" : "Assistant"}</div>
            <div className="mt-1">{h.text}</div>
          </div>
        ))}
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <form onSubmit={sendMessage} className="w-full mt-2">
        <textarea
          placeholder="Ask about course planning, degree requirements, or suggestions..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          onKeyDown={(e) => {
            // Send on Enter, allow newline with Shift+Enter
            if (e.key === "Enter" && !e.shiftKey) {
              sendMessage(e);
            }
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
        />
      </form>
    </div>
  );
}
