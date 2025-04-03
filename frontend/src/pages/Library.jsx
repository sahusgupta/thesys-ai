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
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      <div className="flex-1 p-4 md:p-6">
        {/* Gradient Banner */}
        <div
          className="rounded-md p-4 mb-6 text-gray-800 shadow-sm relative overflow-hidden"
          style={{
            background: 'linear-gradient(120deg, #f0f9ff 0%, #e0f4f8 35%, #ffffff 100%)',
          }}
        >
          <div className="relative">
            <h1 className="text-2xl font-bold mb-2">📚 Research Library</h1>
            <p className="text-sm text-gray-700">
              Look for relevant documents and citations within your library.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Search your library..."
            className="flex-grow border border-gray-300 rounded-lg p-3 focus:ring-[#4B8795] focus:border-[#4B8795]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="bg-[#4B8795] text-white px-6 py-2 rounded-lg hover:bg-[#407986] transition"
          >
            Search
          </button>
        </form>

        <div className="grid gap-4">
          {results.map((res) => (
            <div key={res.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition">
              <h2 className="font-semibold text-[#4B8795]">{res.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{res.snippet}</p>
            </div>
          ))}
          {!results.length && query && (
            <div className="text-center text-gray-500 py-8">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
