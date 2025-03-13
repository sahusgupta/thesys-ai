import React, { useState } from 'react';

const Upload = () => {
  const [file, setFile] = useState(null);
  const handleFileChange = (e) => setFile(e.target.files[0]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="border-dashed border-2 p-12 rounded-xl text-center transition duration-200 hover:border-gray-500 hover:bg-white">
        <input id="fileUpload" type="file" className="hidden" onChange={handleFileChange} />
        <label htmlFor="fileUpload" className="cursor-pointer bg-black text-white px-8 py-4 rounded-full">
          {file ? file.name : "Click or Drag Document Here"}
        </label>
      </div>
    </div>
  );
};

export default Upload;
