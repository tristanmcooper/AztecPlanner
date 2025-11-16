
import React, { useState, useEffect, useRef } from "react";

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when messages or loading state change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history, loading]);

  async function sendMessage(eOrMsg) {
    let userMsg;

    // Support both: form submit event OR direct message string
    if (typeof eOrMsg === "string") {
      userMsg = eOrMsg;
    } else {
      eOrMsg && eOrMsg.preventDefault();
      if (!message.trim()) return;
      userMsg = message.trim();
    }

    setLoading(true);
    setError(null);
    setMessage("");
    setHistory((h) => [...h, { role: "user", text: userMsg }]);

    try {
      const resp = await fetch(`http://127.0.0.1:8000/rag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!resp.ok) throw new Error(`AI request failed: ${resp.status}`);

      const data = await resp.json();
      const reply =
        typeof data?.reply === "string" ? data.reply : "(no response)";

      // Only show the model's reply; do not append retrieved_documents
      setHistory((h) => [...h, { role: "assistant", text: reply }]);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function TypingIndicator() {
    return (
      <div className="flex justify-start mb-2">
        <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.2s]" />
          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0s]" />
          <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
    );
  }

  function MessageBubble({ role, text }) {
    const isUser = role === "user";
    return (
      <div
        className={`mb-2 flex ${
          isUser ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-[#A6192E] text-white"
              : "bg-gray-100 text-gray-900"
          }`}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
      {/* Tighter spacing under header so content isn't pushed way down */}
      <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>

      <div
        className="ai-chat overflow-auto flex-1 mb-3 space-y-1"
        aria-live="polite"
      >
        {history.length === 0 && (
          <div className="text-gray-600 text-center mt-2">
            <p className="font-medium mb-4">
              Ask me anything about courses!
            </p>
            <div className="flex flex-col space-y-1">
              {[
                "What prerequisites do I need for CS460?",
                "Dominic Dabish Rate My Professor score?",
                "Which terms is CS420 offered in?",
                "What courses cover data science topics?",
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(prompt)}
                  className="text-[#A6192E] hover:underline text-sm text-center transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((h, i) => (
          <MessageBubble key={i} role={h.role} text={h.text} />
        ))}

        {loading && <TypingIndicator />}

        <div ref={chatEndRef} />
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      <form onSubmit={sendMessage} className="w-full mt-1">
        <textarea
          placeholder="Ask about course planning, degree requirements, or suggestions..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) sendMessage(e);
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
        />
      </form>
    </div>
  );
}
