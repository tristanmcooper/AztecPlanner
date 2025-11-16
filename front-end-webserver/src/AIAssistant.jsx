// import React, { useState } from "react";

// export default function AIAssistant() {
//   const [message, setMessage] = useState("");
//   const [history, setHistory] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   async function sendMessage(eOrMsg) {
//     let userMsg;

//     // Support both: form submit event OR direct message string
//     if (typeof eOrMsg === "string") {
//       userMsg = eOrMsg;
//     } else {
//       eOrMsg && eOrMsg.preventDefault();
//       if (!message) return;
//       userMsg = message;
//     }

//     setLoading(true);
//     setError(null);
//     setMessage("");
//     setHistory((h) => [...h, { role: "user", text: userMsg }]);

//     try {
//       const resp = await fetch(`http://127.0.0.1:8000/rag`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ message: userMsg }),
//       });
//       if (!resp.ok) throw new Error(`AI request failed: ${resp.status}`);
//       const data = await resp.json();
//       const reply = data?.reply ?? "(no response)";
//       const retrieved = data?.retrieved_documents;
//       const assistantText =
//         retrieved && retrieved.length > 0
//           ? reply + "\n\nRetrieved documents:\n" + retrieved.join("\n---\n")
//           : reply;
//       setHistory((h) => [...h, { role: "assistant", text: assistantText }]);
//     } catch (err) {
//       setError(err.message || String(err));
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
//       <h3 className="text-lg font-semibold mb-12">AI Assistant</h3>

//       <div className="ai-chat overflow-auto mb-4 flex-1" aria-live="polite">
//         {history.length === 0 && (
//           <div className="text-gray-600 text-center">
//             <p className="font-medium mb-12">Ask me anything about courses!</p>
//             <div className="flex flex-col space-y-1">
//               {[
//                 "What prerequisites do I need for CS460?",
//                 "Dominic Dabish Rate My Professor score?",
//                 "Which terms is CS420 offered in?",
//                 "What courses cover data science topics?",
//               ].map((prompt, idx) => (
//                 <button
//                   key={idx}
//                   onClick={() => sendMessage(prompt)}
//                   className="text-[#A6192E] hover:underline text-sm text-center transition-colors"
//                 >
//                   {prompt}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {history.map((h, i) => (
//           <div key={i} className="mb-2">
//             <div className="text-xs text-gray-500">
//               {h.role === "user" ? "You" : "Assistant"}
//             </div>
//             <div className="mt-1 whitespace-pre-line">{h.text}</div>
//           </div>
//         ))}
//       </div>

//       {error && <div className="text-red-600 mb-2">{error}</div>}

//       <form onSubmit={sendMessage} className="w-full mt-2">
//         <textarea
//           placeholder="Ask about course planning, degree requirements, or suggestions..."
//           value={message}
//           onChange={(e) => setMessage(e.target.value)}
//           rows={3}
//           onKeyDown={(e) => {
//             if (e.key === "Enter" && !e.shiftKey) sendMessage(e);
//           }}
//           className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
//         />
//       </form>
//     </div>
//   );
// }

import React, { useState } from "react";

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function sendMessage(eOrMsg) {
    let userMsg;

    // Support both: form submit event OR direct message string
    if (typeof eOrMsg === "string") {
      userMsg = eOrMsg;
    } else {
      eOrMsg && eOrMsg.preventDefault();
      if (!message) return;
      userMsg = message;
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

  return (
    <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-12">AI Assistant</h3>

      <div className="ai-chat overflow-auto mb-4 flex-1" aria-live="polite">
        {history.length === 0 && (
          <div className="text-gray-600 text-center">
            <p className="font-medium mb-12">Ask me anything about courses!</p>
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
          <div key={i} className="mb-2">
            <div className="text-xs text-gray-500">
              {h.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="mt-1 whitespace-pre-line">{h.text}</div>
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
            if (e.key === "Enter" && !e.shiftKey) sendMessage(e);
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
        />
      </form>
    </div>
  );
}
