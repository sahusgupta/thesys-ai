// src/pages/Search.jsx

import React, { useState } from 'react';

const dummyResults = [
  { id: 1, title: 'Deep Learning for Image Recognition', snippet: 'This paper explores...' },
  { id: 2, title: 'AI in Finance: Risk Modeling', snippet: 'Financial markets rely on AI...' },
  { id: 3, title: 'Natural Language Processing Overview', snippet: 'NLP techniques are crucial...' },
];

function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (e) => {
    e.preventDefault();
    // For now, just filter dummy results
    const filtered = dummyResults.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  };

  return (
    <div className="min-h-screen p-8 bg-white">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">AI Search</h1>
      <p className="mb-4 text-gray-700">
        Search your documents and citations using powerful AI indexing.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          className="border border-gray-300 rounded-lg p-2 flex-grow"
          placeholder="Enter your search query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Search
        </button>
      </form>

      <div className="grid gap-4">
        {results.map((res) => (
          <div key={res.id} className="bg-gray-50 p-4 rounded-lg shadow hover:shadow-md">
            <h2 className="text-xl font-semibold text-gray-800">{res.title}</h2>
            <p className="text-gray-600 text-sm">{res.snippet}</p>
          </div>
        ))}
        {results.length === 0 && (
          <p className="text-gray-500">No results found. Try refining your query.</p>
        )}
      </div>
    </div>
  );
}

export default Search;
