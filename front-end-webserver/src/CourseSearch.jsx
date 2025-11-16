import React, { useState } from "react";

export default function CourseSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function doSearch(e) {
    e && e.preventDefault();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
    const resp = await fetch(`http://127.0.0.1:8000/courses/search?q=${encodeURIComponent(query)}`);
      if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
      const data = await resp.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="w-full bg-white border rounded p-3 flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-2">Course Search</h3>

      <form onSubmit={doSearch} className="flex w-full">
        <input
          aria-label="Search courses"
          placeholder="Search courses, code, subject, topic..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doSearch(e);
          }}
          className="flex-1 px-3 py-2 border rounded-l focus:outline-none focus:ring"
        />

      </form>

      {error && <div className="text-red-600 mt-2">{error}</div>}

      <ul className="mt-3 divide-y divide-gray-100 overflow-auto flex-1 w-full">
        {results.length === 0 && !loading && (
          <li className="py-2 text-gray-500 italic">No results</li>
        )}
        {results.map((r, idx) => (
          <li
            key={r.id ?? r.code ?? idx}
            className="py-2 flex items-center justify-between"
          >
            <div className="truncate pr-4">
              <div className="font-medium">{r.code ?? r.title ?? r.name}</div>
              <div className="text-sm text-gray-600 truncate">{r.title ? r.title : r.description}</div>
            </div>
            <div>
              <button
                onClick={() => selectCourse(r)}
                className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              >
                Add
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
