// src/pages/Search.jsx
import React, { useState } from 'react';

const dummyResults = [
  { id: 1, title: 'Deep Learning for Image Recognition', snippet: 'This explores...' },
  { id: 2, title: 'AI in Finance: Risk Modeling', snippet: 'Financial markets rely on...' },
  { id: 3, title: 'NLP Techniques in Chatbots', snippet: 'Natural Language Processing...' },
];

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query) {
      setResults([]);
      return;
    }
    const filtered = dummyResults.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  };

  return (
    <div className="bg-white min-h-screen text-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-4">AI Search</h1>
      <p className="text-gray-700 text-sm mb-4">
        Look for relevant documents and citations within your library.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter a query..."
          className="flex-grow border border-gray-300 rounded px-2 py-1 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="bg-[#4B8795] text-white text-sm px-4 py-2 rounded hover:bg-[#407986] transition"
        >
          Search
        </button>
      </form>

      <div className="grid gap-3">
        {results.map((res) => (
          <div key={res.id} className="p-3 border rounded hover:shadow-sm transition">
            <h2 className="font-semibold text-gray-800 text-sm">{res.title}</h2>
            <p className="text-xs text-gray-600">{res.snippet}</p>
          </div>
        ))}
        {!results.length && query && (
          <p className="text-gray-500 text-sm">No results found.</p>
        )}
      </div>
    </div>
  );
}
