// src/pages/Citations.jsx
import React, { useState } from 'react';

const dummyCitations = [
  {
    id: 1,
    title: 'Artificial Intelligence in Healthcare',
    authors: 'Smith, J. & Taylor, A.',
    format: 'APA',
    citationText:
      'Smith, J., & Taylor, A. (2021). Artificial Intelligence in Healthcare...',
  },
  {
    id: 2,
    title: 'Deep Learning for Climate Modeling',
    authors: 'Green, B.',
    format: 'MLA',
    citationText:
      'Green, B. “Deep Learning for Climate Modeling.” AI Journal, 2022...',
  },
];

export default function Citations() {
  const [showFormats, setShowFormats] = useState(false);

  const toggleFormats = () => setShowFormats(!showFormats);

  return (
    <div className="bg-white min-h-screen text-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-4">Citations</h1>
      <p className="text-gray-700 text-sm mb-4">
        Manage all your citations in one place. Toggle to see full citation text.
      </p>

      <button
        onClick={toggleFormats}
        className="px-4 py-2 rounded bg-[#4B8795] text-white hover:bg-[#407986] transition text-sm"
      >
        {showFormats ? 'Hide Citation Formats' : 'Show Citation Formats'}
      </button>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {dummyCitations.map((cite) => (
          <div
            key={cite.id}
            className="border border-gray-200 rounded p-4 hover:shadow-sm transition"
          >
            <h2 className="font-semibold text-gray-800 mb-1">{cite.title}</h2>
            <p className="text-gray-600 text-xs">{cite.authors}</p>
            {showFormats && (
              <div className="mt-2 text-sm text-gray-700">
                <p className="font-bold">{cite.format} Format:</p>
                <p>{cite.citationText}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
