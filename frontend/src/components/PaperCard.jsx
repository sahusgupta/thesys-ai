import React from 'react';
import { FiHeart, FiDownload } from 'react-icons/fi';
import { handlePaperLike } from '../pages/Chat';

export default function PaperCard({ paper }) {
  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Like button clicked for paper:', paper.id);
    handlePaperLike(paper.id, paper.title);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-2">{paper.title}</h3>
      <p className="text-gray-600 mb-4">{paper.abstract}</p>
      <div className="flex justify-between items-center">
        <button 
          onClick={handleLike}
          className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
        >
          <FiHeart />
          <span>Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors">
          <FiDownload />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
} 