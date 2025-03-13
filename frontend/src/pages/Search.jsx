import React from 'react';

const Search = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-gray-50">
      <h2 className="text-4xl font-bold">AI Research Search</h2>
      <div className="mt-6 flex">
        <input className="border rounded-l-lg p-4 shadow-inner w-96" placeholder="Ask AI..." />
        <button className="bg-black text-white py-3 px-6 rounded-r-lg hover:bg-gray-700 transition duration-200">Search</button>
      </div>
    </div>
  );
};

export default Search;
