// src/pages/Search.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaHeart, FaRegHeart, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';

export default function Search() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  // State for library status and actions
  const [libraryStatus, setLibraryStatus] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [actionMessage, setActionMessage] = useState({});

  // Fetch library status when papers change
  useEffect(() => {
    if (papers.length > 0 && currentUser) {
      const checkStatus = async () => {
        const paperUrls = papers.map(p => p.url).filter(Boolean);
        if (paperUrls.length === 0) return;

        try {
          const response = await fetch('http://localhost:5000/api/library/check_status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: currentUser.uid, paper_urls: paperUrls }),
          });
          const data = await response.json();
          if (data.status === 'success') {
            setLibraryStatus(data.library_status || {});
          } else {
            console.error("Failed to fetch library status:", data.message);
            setLibraryStatus(paperUrls.reduce((acc, url) => ({...acc, [url]: {inLibrary: false}}), {}));
          }
        } catch (err) {
          console.error('Error fetching library status:', err);
          setLibraryStatus(paperUrls.reduce((acc, url) => ({...acc, [url]: {inLibrary: false}}), {}));
        }
      };
      checkStatus();
    } else {
        setLibraryStatus({});
    }
  }, [papers, currentUser]);

  const searchPapers = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setPapers([]);
    setLibraryStatus({});
    setActionLoading({});
    setActionMessage({});

    try {
      const response = await fetch('http://localhost:5000/api/papers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to search papers');
      }

      const data = await response.json();
      setPapers(data.papers?.filter(p => p.url) || []);
    } catch (err) {
      setError(err.message || 'Failed to search papers. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (paper) => {
    if (!currentUser || !paper?.url) return;
    const paperUrl = paper.url;
    const currentStatus = libraryStatus[paperUrl] || { inLibrary: false };
    const fileId = currentStatus.file_id;

    setActionMessage({ ...actionMessage, [paperUrl]: '' });
    setActionLoading({ ...actionLoading, [paperUrl]: currentStatus.inLibrary ? 'removing' : 'adding' });

    try {
      let response;
      if (currentStatus.inLibrary && fileId) {
        response = await fetch(`/api/library/files/${fileId}/delete?user_id=${currentUser.uid}`, {
          method: 'DELETE',
          headers: {
          },
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to remove paper');
        }
        setLibraryStatus(prev => ({ ...prev, [paperUrl]: { inLibrary: false, file_id: null } }));
        setActionMessage({ ...actionMessage, [paperUrl]: 'Removed from library.' });
      } else {
        const payload = {
            user_id: currentUser.uid,
            paper_details: {
                id: paper.id,
                title: paper.title,
                authors: paper.authors,
                year: paper.year,
                abstract: paper.abstract,
                url: paper.url
            }
        };
        response = await fetch('/api/library/add_from_search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
          throw new Error(data.message || 'Failed to add paper');
        }
        setLibraryStatus(prev => ({ ...prev, [paperUrl]: { inLibrary: true, file_id: data.file_id } }));
        setActionMessage({ ...actionMessage, [paperUrl]: 'Added to library!' });
      }
    } catch (err) {
      console.error('Error toggling library status:', err);
      setActionMessage({ ...actionMessage, [paperUrl]: `Error: ${err.message}` });
    } finally {
      setActionLoading({ ...actionLoading, [paperUrl]: null });
      setTimeout(() => setActionMessage(prev => ({...prev, [paperUrl]: null })), 3000);
    }
  };

  const handleViewOrDownload = async (paper) => {
    if (!paper?.url) return;
    const paperUrl = paper.url;
    const currentStatus = libraryStatus[paperUrl] || { inLibrary: false };

    if (currentStatus.inLibrary && currentStatus.file_id && currentUser) {
      setActionLoading({ ...actionLoading, [paperUrl]: 'downloading' });
      setActionMessage({ ...actionMessage, [paperUrl]: 'Getting download link...'});
      try {
        const response = await fetch(`/api/library/files/${currentStatus.file_id}/url?user_id=${currentUser.uid}`);
        const data = await response.json();
        if (response.ok && data.status === 'success' && data.url) {
          window.open(data.url, '_blank');
          setActionMessage({ ...actionMessage, [paperUrl]: 'Opening file...'});
        } else {
           throw new Error(data.message || 'Could not get download link');
        }
      } catch(err) {
           console.error('Error getting presigned URL:', err);
           setActionMessage({ ...actionMessage, [paperUrl]: `Error: ${err.message}` });
      } finally {
           setActionLoading({ ...actionLoading, [paperUrl]: null });
           setTimeout(() => setActionMessage(prev => ({...prev, [paperUrl]: null })), 3000);
      }
    } else {
      window.open(paperUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Search Papers</h1>
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for papers..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B8795]"
            />
            <button
              onClick={searchPapers}
              disabled={loading}
              className="px-4 py-2 bg-[#4B8795] text-white rounded-md hover:bg-[#407986] focus:outline-none focus:ring-2 focus:ring-[#4B8795] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {papers.map((paper) => {
            const status = libraryStatus[paper.url] || { inLibrary: false };
            const isLoadingAction = actionLoading[paper.url];
            const message = actionMessage[paper.url];
            const isInLibrary = status.inLibrary;

            return (
              <div key={paper.id || paper.url} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">{paper.title}</h2>
                    <p className="text-gray-600 text-sm mb-1">{paper.authors?.join(', ' ) || 'N/A'}</p>
                    <p className="text-gray-500 text-xs">{paper.year || 'N/A'}</p>
                    {message && (
                        <p className={`text-xs mt-1 ${message.includes('Error') ? 'text-red-500' : message.includes('Added') || message.includes('Removed') ? 'text-green-500' : 'text-gray-500'}`}>
                            {message}
                        </p>
                    )}
                  </div>
                  <div className="flex gap-3 items-center flex-shrink-0">
                    <button
                      onClick={() => toggleFavorite(paper)}
                      disabled={!!isLoadingAction}
                      className={`p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isInLibrary ? 'text-red-500' : 'text-gray-500'
                      }`}
                      title={isInLibrary ? "Remove from library" : "Add to library"}
                    >
                      {isLoadingAction === 'adding' || isLoadingAction === 'removing' ? (
                        <Loader2 className="animate-spin" size={18}/>
                      ) : isInLibrary ? (
                        <FaHeart size={18} />
                      ) : (
                        <FaRegHeart size={18} />
                      )}
                    </button>
                    <button
                       onClick={() => handleViewOrDownload(paper)}
                       disabled={isLoadingAction === 'downloading'}
                       className="p-1 rounded-full text-gray-500 hover:text-[#407986] hover:bg-gray-100 disabled:opacity-50"
                       title={isInLibrary ? "View/Download from Library" : "View External Source"}
                     >
                       {isLoadingAction === 'downloading' ? (
                         <Loader2 className="animate-spin" size={18}/>
                       ) : isInLibrary ? (
                         <FaDownload size={18} />
                       ) : (
                         <FaExternalLinkAlt size={18}/>
                       )}
                    </button>
                  </div>
                </div>
                {paper.abstract && (
                    <p className="mt-3 text-sm text-gray-700 line-clamp-3">{paper.abstract}</p>
                )}
              </div>
            );
          })}
        </div>
        
        {loading && <div className="text-center py-4"><Loader2 className="animate-spin inline-block"/></div>}
        
        {!loading && papers.length === 0 && query && (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-600">
             No papers found matching your search criteria.
           </div>
        )}
        
      </div>
    </div>
  );
}
