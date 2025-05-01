// src/pages/Search.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { addActivity, ACTIVITY_TYPES } from '../utils/activityTracker';
import { FiUpload, FiFile, FiTrash2, FiDownload, FiSearch } from 'react-icons/fi';

const Library = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      
      // Track file upload immediately
      console.log('=== FILE UPLOAD TRIGGERED ===');
      console.log('File:', file.name);
      addActivity(ACTIVITY_TYPES.FILE_DOWNLOADED, {
        fileName: file.name,
        fileType: file.type,
        size: file.size
      });
      
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
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-foreground">Library</h1>
        <label className="btn-primary px-4 py-2 rounded-md cursor-pointer">
          <span>Upload File</span>
          <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
        </label>
      </div>

      {/* Search and Filters */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 bg-background border border-input rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select className="bg-background border border-input rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All Types</option>
            <option value="pdf">PDF</option>
            <option value="doc">Word</option>
            <option value="excel">Excel</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Documents</h2>
        </div>
        <div className="divide-y divide-border">
          {files.map((file) => (
            <div key={file.id} className="p-4 hover:bg-accent/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <FiFile className="text-primary" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{file.file_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {getFileIcon(file.file_type)} • {file.size} • {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewFile(file)}
                    className="p-2 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                  >
                    <FiDownload size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-8 border-dashed">
        <div className="flex flex-col items-center justify-center text-center">
          <FiUpload size={40} className="text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Drop files here</h3>
          <p className="text-sm text-muted-foreground mb-4">
            or click to select files
          </p>
          <label className="btn-secondary px-4 py-2 rounded-md cursor-pointer">
            <span>Browse Files</span>
            <input type="file" className="hidden" multiple />
          </label>
        </div>
      </div>

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
  );
};

export default Library;
