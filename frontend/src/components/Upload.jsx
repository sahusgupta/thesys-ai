import React, { useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import axios from 'axios';

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // First, get the pre-signed URL from the backend
      const response = await axios.post('http://localhost:5000/api/upload', {
        filename: file.name,
        filetype: file.type,
        user_id: 'current_user_id' // Replace with actual user ID from auth context
      });

      if (response.data.status === 'success') {
        // Upload the file to S3 using the pre-signed URL
        await axios.put(response.data.url, file, {
          headers: {
            'Content-Type': file.type
          }
        });

        setSuccess(true);
        setFile(null);
      } else {
        throw new Error(response.data.message || 'Failed to get upload URL');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-4">Upload File</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
          File uploaded successfully!
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex-1">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#407986] transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
              />
              <Upload size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600">
                {file ? file.name : 'Click to select a file or drag and drop'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, DOC, DOCX, TXT
              </p>
            </div>
          </label>
        </div>

        {file && (
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <X size={20} />
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-[#407986] text-white rounded-lg hover:bg-[#2c5a66] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload; 