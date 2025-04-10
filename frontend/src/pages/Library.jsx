// src/pages/Search.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const Library = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [uploading, setUploading] = useState(false);

  // Mock user ID - replace with actual user authentication
  const userId = 'current_user_id';

  useEffect(() => {
    fetchUserFiles();
  }, []);

  const fetchUserFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('/api/library/files', {
        user_id: userId
      });

      if (response.data.status === 'success') {
        setFiles(response.data.files);
      } else {
        setError(response.data.message || 'Failed to fetch files');
      }
    } catch (err) {
      setError('Error fetching files. Please try again later.');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);

      const response = await axios.post('/api/papers/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.status === 'success') {
        // Refresh the files list
        await fetchUserFiles();
      } else {
        setError(response.data.message || 'Failed to upload file');
      }
    } catch (err) {
      setError('Error uploading file. Please try again later.');
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleViewFile = async (file) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`/api/library/files/${file.id}`, {
        user_id: userId
      });

      if (response.data.status === 'success') {
        setSelectedFile(response.data.file);
      } else {
        setError(response.data.message || 'Failed to load file');
      }
    } catch (err) {
      setError('Error loading file. Please try again later.');
      console.error('Error loading file:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`/api/library/files/${fileId}/delete`, {
        user_id: userId
      });

      if (response.data.status === 'success') {
        setFiles(files.filter(file => file.id !== fileId));
        if (selectedFile?.id === fileId) {
          setSelectedFile(null);
        }
      } else {
        setError(response.data.message || 'Failed to delete file');
      }
    } catch (err) {
      setError('Error deleting file. Please try again later.');
      console.error('Error deleting file:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'application/pdf':
        return '📄';
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '📝';
      case 'text/plain':
        return '📋';
      default:
        return '📁';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Library</h1>
          <div className="flex gap-4">
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt"
              />
              <label
                htmlFor="file-upload"
                className="bg-[#407986] text-white px-4 py-2 rounded-lg hover:bg-[#2c5a66] cursor-pointer flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <FileText size={20} />
                    Upload File
                  </>
                )}
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#407986] text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-[#407986] text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Grid View
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-[#407986]" size={32} />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by uploading a new file.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {files.map((file) => (
                <div key={file.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getFileIcon(file.file_type)}</span>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{file.file_name}</h3>
                        <p className="text-sm text-gray-500">Uploaded on {formatDate(file.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewFile(file)}
                        className="p-2 text-gray-500 hover:text-[#407986] rounded-full hover:bg-gray-100"
                      >
                        <FileText size={20} />
                      </button>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-[#407986] rounded-full hover:bg-gray-100"
                      >
                        <Download size={20} />
                      </a>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <div key={file.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{getFileIcon(file.file_type)}</span>
                    <h3 className="text-lg font-medium text-gray-900 truncate">{file.file_name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">Uploaded on {formatDate(file.created_at)}</p>
                  <div className="mt-auto flex justify-end gap-2">
                    <button
                      onClick={() => handleViewFile(file)}
                      className="p-2 text-gray-500 hover:text-[#407986] rounded-full hover:bg-gray-100"
                    >
                      <FileText size={20} />
                    </button>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-[#407986] rounded-full hover:bg-gray-100"
                    >
                      <Download size={20} />
                    </a>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getFileIcon(selectedFile.file_type)}</span>
                  <h2 className="text-2xl font-semibold">{selectedFile.file_name}</h2>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="prose max-w-none">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Uploaded on {formatDate(selectedFile.created_at)}</p>
                  <a
                    href={selectedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#407986] hover:text-[#2c5a66] flex items-center gap-1"
                  >
                    <Download size={16} />
                    Download File
                  </a>
                </div>
                
                {selectedFile.content ? (
                  <pre className="whitespace-pre-wrap">{selectedFile.content}</pre>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">File content not available for preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
