import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FiStar, FiDownload } from 'react-icons/fi';
import remarkGfm from 'remark-gfm'; // For GitHub Flavored Markdown (tables, etc.)

const MessageBubble = React.memo(({ message, onPinToggle }) => {
  const { id, sender, text, timestamp, pinned, raw_data, isTyping } = message;
  const isUser = sender === 'User';

  // Basic check for valid paper data
  const papers = Array.isArray(raw_data?.papers) ? raw_data.papers : [];
  const hasPapers = papers.length > 0;

  // Don't render anything if it's just a placeholder for typing
  if (isTyping && !text) {
      return null;
  }

  return (
    <div className={`my-2 flex ${isUser ? 'justify-end' : 'justify-start'} items-start group`}>
      {!isUser && (
        <div className="mr-3 mt-1 flex-shrink-0 bg-gray-300 text-white h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] p-3 rounded-lg shadow-sm ${
          isUser ? 'bg-[#4B8795] text-white' : 'bg-[#F0F4F6] text-gray-800'
        } relative`}
      >
        {/* Message Content */}
        <div className="prose prose-sm max-w-none text-inherit"> {/* Apply prose for markdown styling */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {text || (isTyping ? '...' : '')}
          </ReactMarkdown>
        </div>

        {/* References Section */}
        {hasPapers && !isUser && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <h4 className="text-xs font-semibold mb-2 text-gray-600">References:</h4>
            <ul className="space-y-1">
              {papers.map((paper, index) => (
                <li key={paper.id || index} className="text-xs text-gray-700 flex items-center justify-between group/paper">
                  <span className="truncate pr-2">
                    {paper.title || 'Unknown Title'} ({paper.year || 'N/A'})
                  </span>
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Download "${paper.title}"`}
                      className="ml-2 text-blue-600 hover:text-blue-800 p-1 opacity-0 group-hover/paper:opacity-100 transition-opacity"
                      // Consider adding onClick={() => logDownload(paper.id)} if backend logging is implemented
                    >
                      <FiDownload />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp and Pin Button */}
        <div className="text-xs mt-2 flex items-center justify-end text-gray-400 group-hover:text-gray-500">
           <span className="mr-2">{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
           <button
             onClick={() => onPinToggle(id)}
             className={`p-1 rounded ${
               pinned ? 'text-yellow-500' : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-yellow-500'
             } transition`}
             title={pinned ? "Unpin message" : "Pin message"}
           >
             <FiStar size={12} fill={pinned ? 'currentColor' : 'none'} />
           </button>
        </div>
      </div>
      {isUser && (
        <div className="ml-3 mt-1 flex-shrink-0 bg-blue-500 text-white h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold">
          You
        </div>
      )}
    </div>
  );
});

export default MessageBubble; 