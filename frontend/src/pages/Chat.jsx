// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FiSend, FiUpload, FiCode, FiBook, FiSettings } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

/**
 * Format the response text based on the question type and content
 */
const formatResponse = (text, question) => {
  if (!text) return 'No response received';
  
  // If the response is already well-formatted, return as is
  if (text.includes('\n') || text.includes('•') || text.includes('*')) {
    return text;
  }

  // Basic question type detection
  const isResearchQuestion = question.toLowerCase().includes('research') || 
                           question.toLowerCase().includes('papers') ||
                           question.toLowerCase().includes('articles');
  
  const isCodeQuestion = question.toLowerCase().includes('code') || 
                        question.toLowerCase().includes('function');
  
  const isFactQuestion = question.toLowerCase().includes('what') || 
                        question.toLowerCase().includes('how') ||
                        question.toLowerCase().includes('why');

  // Simple formatting based on question type
  if (isResearchQuestion) {
    // Split into paragraphs and add bullet points for key points
    const paragraphs = text.split('\n\n');
    return paragraphs.map((para, idx) => {
      if (idx === 0) return para; // Keep introduction as is
      return `• ${para.trim()}`;
    }).join('\n\n');
  }
  
  if (isCodeQuestion) {
    // Add code block markers if not present
    return text.includes('```') ? text : `\`\`\`\n${text}\n\`\`\``;
  }
  
  if (isFactQuestion) {
    // Add bullet points for facts
    const sentences = text.split('. ');
    return sentences.map((sentence, idx) => {
      if (idx === 0) return sentence + '.';
      return `\n• ${sentence.trim()}.`;
    }).join('');
  }

  // Default formatting for other types
  return text;
};

/**
 * Progress indicator component
 */
const ProgressIndicator = ({ progress }) => (
  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
    <div 
      className="h-full bg-[#4B8795] transition-all duration-300"
      style={{ width: `${progress}%` }}
    />
  </div>
);

/**
 * Message bubble component with improved formatting
 */
const MessageBubble = React.memo(({ message }) => {
  const { sender, text, timestamp } = message;
  const isUser = sender === 'User';

  // Format code blocks and lists
  const formatMessageText = (text) => {
    if (!text) return '';
    
    // Split text into lines
    const lines = text.split('\n');
    
    return lines.map((line, idx) => {
      // Handle code blocks
      if (line.startsWith('```')) {
        return (
          <pre key={idx} className="bg-gray-800 text-white p-3 rounded-lg my-2 overflow-x-auto">
            {lines.slice(idx + 1).join('\n').split('```')[0]}
          </pre>
        );
      }
      // Handle bullet points
      if (line.startsWith('•') || line.startsWith('*')) {
        return (
          <div key={idx} className="flex items-start my-1">
            <span className="mr-2">•</span>
            <span>{line.substring(1).trim()}</span>
          </div>
        );
      }
      // Regular text
      return <div key={idx} className="my-1">{line}</div>;
    });
  };

  return (
    <div className={`my-4 flex ${isUser ? 'justify-end' : 'justify-start'} items-end`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-full ${
          isUser ? 'order-2 ml-3 bg-[#4B8795]' : 'order-1 mr-3 bg-gray-200'
        } flex items-center justify-center`}
      >
        <span className="text-sm font-medium text-white">
          {isUser ? 'U' : 'T'}
        </span>
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'order-1' : 'order-2'} max-w-[70%]`}>
        <div
          className={`rounded-2xl px-4 py-2 shadow-sm ${
            isUser ? 'bg-[#4B8795] text-white' : 'bg-[#F0F4F6] text-gray-800'
          }`}
        >
          <div className="text-xs font-medium mb-1 opacity-80">
            {sender}
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {formatMessageText(text)}
          </div>
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-right' : 'text-left'
          } text-gray-500`}
        >
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
});

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const messageIdRef = useRef(0); // For unique message IDs
  const { currentUser } = useAuth();
  const cancelToken = useRef(null);
  const [typingProgress, setTypingProgress] = useState(0);
  const [currentMessageLength, setCurrentMessageLength] = useState(0);
  const [totalMessageLength, setTotalMessageLength] = useState(0);

  useEffect(() => {
    // Generate a chat ID if we don't have one yet
    if (!chatId) {
      setChatId(`chat-${Date.now()}`);
    }
    // Focus input on mount
    inputRef.current?.focus();
  }, [chatId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (sender, text) => {
    const newMessage = {
      id: `msg-${messageIdRef.current++}-${Date.now()}`,
      sender,
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const typeMessage = async (text) => {
    if (!text) return;
    
    // Add the message immediately to ensure it's in the chat
    addMessage('Thesys', text);
    
    // If the message is long, show a brief generating indicator
    if (text.length > 100) {
      setIsGenerating(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Limit message length to 300 characters
    const limitedMessage = trimmed.slice(0, 300);
    
    // Add user message
    addMessage('User', limitedMessage);
    setInputText('');

    try {
      setIsGenerating(true);

      // Simple payload structure
      const payload = {
        message: limitedMessage,
        user_id: currentUser?.uid || 'anonymous',
        chatId
      };

      // Create cancel token
      const source = axios.CancelToken.source();
      cancelToken.current = source;

      // Make the API request
      const response = await axios.post('http://127.0.0.1:5000/api/chat', payload, {
        cancelToken: source.token,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Handle response
      const { data } = response;
      const { text = '', error } = data;

      if (error) {
        await typeMessage(`Error: ${error}`);
      } else {
        // Format and display the response
        const formattedText = formatResponse(text, limitedMessage);
        await typeMessage(formattedText);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        addMessage('Thesys', 'Response generation cancelled.');
      } else {
        addMessage('Thesys', `Error: ${err.message}`);
      }
    } finally {
      setIsGenerating(false);
      cancelToken.current = null;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', currentUser?.uid || 'anonymous');

      const uploadRes = await axios.post('http://127.0.0.1:5000/api/papers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { data } = uploadRes;
      const statusMsg = data.error
        ? `Upload failed: ${data.error}`
        : `Successfully uploaded ${file.name}`;
      addMessage('Thesys', statusMsg);
    } catch (err) {
      addMessage('Thesys', `Error uploading file: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4B8795] to-[#407986] p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Thesys Chat</h1>
            <p className="text-sm opacity-80">AI-Powered Research Assistant</p>
          </div>
          {/* Possibly additional controls */}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>

      {/* Progress Indicator */}
      {isGenerating && (
        <div className="px-4 py-2 border-t">
          <div className="max-w-4xl mx-auto">
            <ProgressIndicator progress={typingProgress} />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {currentMessageLength} / {totalMessageLength} characters
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-3 flex flex-col">
        {/* File Upload */}
        <div className="mb-2">
          <label className="inline-flex items-center px-4 py-2 bg-[#F0F4F6] rounded-lg cursor-pointer text-sm text-gray-700 hover:bg-[#e8edf0] transition">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={isGenerating}
            />
            <FiUpload className="mr-2" />
            Upload Document
          </label>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow p-2 rounded-lg border bg-[#F0F4F6] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4B8795]"
            placeholder="Ask me anything..."
          />
          {/* Send Button */}
          <button
            onClick={isGenerating ? () => cancelToken?.cancel() : handleSend}
            disabled={!inputText.trim() && !isGenerating}
            className={`absolute right-2 bottom-2 p-2 rounded-lg transition ${
              isGenerating
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#4B8795] hover:bg-[#407986] text-white'
            } disabled:opacity-50`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" strokeWidth="2"/>
                </svg>
                Stop
              </span>
            ) : (
              <FiSend className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
