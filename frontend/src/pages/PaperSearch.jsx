import React, { useState } from 'react';
import { Search, Loader2, ExternalLink, BookOpen, PlusSquare, CheckSquare } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const PaperSearch = () => {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const { currentUser } = useAuth();

  const [addingPaperId, setAddingPaperId] = useState(null);
  const [addMessage, setAddMessage] = useState({});
  const [addedPaperIds, setAddedPaperIds] = useState(new Set());

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setPapers([]);
    setAddMessage({});

    try {
      const response = await fetch('http://localhost:5000/api/papers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 10,
          offset: 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch papers');
      }

      setPapers(data.papers || []);
      setTotalResults(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPaper = async (paper) => {
    try {
      const userId = currentUser?.uid || 'anonymous';
      const response = await axios.get(`http://localhost:5000/api/papers/${paper.id}/content`, {
        params: { user_id: userId }
      });

      if (response.data.status === 'success') {
        setSelectedPaper(response.data.paper);
      } else {
        setError(response.data.message || 'Failed to load paper content');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading paper content');
    }
  };

  const handleAddToLibrary = async (paper) => {
    if (!currentUser) {
      setAddMessage({ ...addMessage, [paper.id]: 'Error: Please log in to add papers.' });
      return;
    }
    if (addedPaperIds.has(paper.id)) {
      setAddMessage({ ...addMessage, [paper.id]: 'Already in library' });
      return;
    }

    setAddingPaperId(paper.id);
    setAddMessage({ ...addMessage, [paper.id]: 'Adding...' });

    try {
      const payload = {
        user_id: currentUser.uid,
        paper_details: {
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          abstract: paper.abstract,
          url: paper.url,
        }
      };

      console.log("Sending payload to add library:", payload);

      const response = await fetch('http://localhost:5000/api/library/add_from_search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add paper to library');
      }

      if (data.status === 'success') {
        setAddMessage({ ...addMessage, [paper.id]: 'Added!' });
        setAddedPaperIds(prev => new Set(prev).add(paper.id));
      } else {
        throw new Error(data.message || 'Backend error adding paper');
      }
    } catch (err) {
      console.error("Add to library error:", err);
      setAddMessage({ ...addMessage, [paper.id]: `Error: ${err.message}` });
    } finally {
      setAddingPaperId(null);
      setTimeout(() => setAddMessage(prev => ({...prev, [paper.id]: addedPaperIds.has(paper.id) ? 'Added!' : null })), 3000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Research Paper Search</h1>
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for research papers..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#407986] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#407986] text-white rounded-lg hover:bg-[#2c5a66] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {papers.length > 0 && (
          <p className="text-gray-600 mb-6">
            Found {totalResults} papers matching your search
          </p>
        )}

        <div className="space-y-6">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h2
                  className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-[#407986] mr-4"
                  onClick={() => handleViewPaper(paper)}
                  title={paper.title}
                >
                  {paper.title}
                </h2>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => handleAddToLibrary(paper)}
                    disabled={addingPaperId === paper.id || addedPaperIds.has(paper.id)}
                    className={`text-[#407986] hover:text-[#2c5a66] flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={addedPaperIds.has(paper.id) ? "Already in Library" : "Add to Library"}
                  >
                    {addingPaperId === paper.id ?
                      <Loader2 className="animate-spin" size={16} /> :
                      addedPaperIds.has(paper.id) ?
                      <CheckSquare size={16} /> :
                      <PlusSquare size={16} />}
                    <span className="text-sm hidden md:inline">{addedPaperIds.has(paper.id) ? 'Added' : 'Add Library'}</span>
                  </button>
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#407986] hover:text-[#2c5a66] flex items-center gap-1"
                    title="View external paper source"
                  >
                    <ExternalLink size={16} />
                    <span className="text-sm hidden md:inline">View Paper</span>
                  </a>
                </div>
              </div>
              {addMessage[paper.id] && (
                <p className={`text-xs mt-1 ${addMessage[paper.id]?.includes('Error') ? 'text-red-500' : addMessage[paper.id]?.includes('Added') ? 'text-green-500' : 'text-gray-500'}`}>
                  {addMessage[paper.id]}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600 my-4">
                <div className="flex items-center gap-1">
                  <BookOpen size={16} />
                  {paper.authors.join(', ')}
                </div>
                <span>•</span>
                <span>{paper.year}</span>
                {paper.venue && (
                  <>
                    <span>•</span>
                    <span>{paper.venue}</span>
                  </>
                )}
                <span>•</span>
                <span>{paper.citations} citations</span>
              </div>
              {paper.abstract && (
                <p className="text-gray-700 line-clamp-3">
                  {paper.abstract}
                </p>
              )}
            </div>
          ))}
        </div>

        {!loading && papers.length === 0 && query && (
          <div className="text-center text-gray-600 py-8">
            No papers found matching your search. Try different keywords.
          </div>
        )}

        {selectedPaper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-semibold">{selectedPaper.title}</h2>
                <button
                  onClick={() => setSelectedPaper(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {selectedPaper.content ? (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap">{selectedPaper.content}</pre>
                </div>
              ) : (
                <div className="text-center py-8">
                  <a
                    href={selectedPaper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#407986] hover:text-[#2c5a66] flex items-center gap-1 justify-center"
                  >
                    <ExternalLink size={16} />
                    View PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperSearch; 