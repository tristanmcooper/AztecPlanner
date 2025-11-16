// front-end-webserver/src/AIAssistant.jsx
import React, { useState, useEffect, useRef } from "react";

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const chatEndRef = useRef(null);

  const suggestedPrompts = [
    "What prerequisites do I need for CS 160?",
    "Dominic Dabish Rate My Professor score?",
    "Which terms is CS 420 offered in?",
    "What courses cover data science topics?",
  ];

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

  // Inline markdown: **bold**
  function renderInlineMarkdown(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, i) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        return (
          <strong key={i} className="font-semibold">
            {boldMatch[1]}
          </strong>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  }

  // Block-level markdown: paragraphs, blank lines, and bullet lists (* or -)
  function renderSimpleMarkdown(text) {
    const lines = text.split("\n");
    const elements = [];
    let i = 0;
    let keyCounter = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Bullet list item?
      const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
      if (bulletMatch) {
        const items = [];
        while (i < lines.length) {
          const m = lines[i].match(/^\s*[-*]\s+(.*)$/);
          if (!m) break;
          items.push(m[1]);
          i++;
        }

        elements.push(
          <ul
            key={`ul-${keyCounter++}`}
            className="list-disc list-inside space-y-1"
          >
            {items.map((item, idx) => (
              <li key={idx} className="text-sm">
                {renderInlineMarkdown(item)}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Blank line -> just a spacer
      if (line.trim() === "") {
        elements.push(<br key={`br-${keyCounter++}`} />);
        i++;
        continue;
      }

      // Normal paragraph line
      elements.push(
        <p key={`p-${keyCounter++}`} className="text-sm">
          {renderInlineMarkdown(line)}
        </p>
      );
      i++;
    }

    return elements;
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
          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            isUser
              ? "bg-[#A6192E] text-white"
              : "bg-gray-100 text-gray-900"
          }`}
        >
          {renderSimpleMarkdown(text)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>

      <div
        className="ai-chat overflow-auto flex-1 mb-3 space-y-1"
        aria-live="polite"
      >
        {history.length === 0 && (
          <div className="text-center mt-4">
            <p className="text-base font-semibold text-gray-700">
              Ask me anything about courses!
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Get help with courses, prerequisites, and degree planning.
            </p>
            <p className="mt-3 text-xs text-gray-500 uppercase tracking-wide">
              Suggested questions
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-1 rounded-full border border-[#A6192E]/40 text-xs text-[#A6192E] hover:bg-[#A6192E] hover:text-white transition-colors"
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

      {error && <div className="text-red-600 mb-2 text-sm">{error}</div>}

      <form onSubmit={sendMessage} className="w-full mt-1">
        <textarea
          placeholder="Ask about course planning, degree requirements, or suggestions..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(message);
            }
          }}
          className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring"
        />
      </form>
    </div>
  );
}
