// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FiSend, FiUpload, FiPlus, FiEdit, FiTrash2, FiSearch, FiStar, FiDownload } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

/**
 * This version persists chats in localStorage.
 * Additional functionality is included:
 * 1) Search bar to filter messages in the active chat.
 * 2) Ability to pin messages and view them separately.
 * 3) A download button to export the current chat to a text file.
 * 
 * The reference for isGenerating remains at line 152.
 */

const formatResponse = (text) => {
  if (!text) return 'No response.';
  // Simple check for code blocks
  if (!text.includes('```') && (text.toLowerCase().includes('function') || text.toLowerCase().includes('class'))) {
    return `\`\`\`\n${text}\n\`\`\``;
  }
  return text;
};

const MessageBubble = React.memo(({ message, onPinToggle }) => {
  const { sender, text, timestamp, pinned } = message;
  const isUser = sender === 'User';

  return (
    <div className={`my-2 flex ${isUser ? 'justify-end' : 'justify-start'} items-start`}>
      {!isUser && (
        <div className="mr-3 flex-shrink-0 bg-gray-300 text-white h-8 w-8 rounded-full flex items-center justify-center">
          T
        </div>
      )}
      <div
        className={`max-w-[70%] p-3 rounded-xl shadow-sm ${
          isUser ? 'bg-[#4B8795] text-white' : 'bg-[#F0F4F6] text-gray-800'
        } relative`}
      >
        <div className="text-xs font-semibold mb-1 flex items-center justify-between">
          <span>{sender}</span>
          {/* Pin toggle */}
          <button
            onClick={() => onPinToggle(message.id)}
            className={`ml-2 text-xs p-1 rounded ${
              pinned ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
            } transition`}
          >
            <FiStar />
          </button>
        </div>
        <div className="whitespace-pre-wrap break-words text-sm">{text}</div>
        <div className="text-xs text-right opacity-70 mt-1">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
      {isUser && (
        <div className="ml-3 flex-shrink-0 bg-[#4B8795] text-white h-8 w-8 rounded-full flex items-center justify-center">
          U
        </div>
      )}
    </div>
  );
});

export default function Chat() {
  /**
   * Chat sessions are stored here. Each session has:
   * {
   *   id: string,
   *   title: string,
   *   messages: [{ id, sender, text, timestamp, pinned }],
   *   lastResponseVector: (array or null),
   * }
   */
  const [chats, setChats] = useState(() => {
    // Load from localStorage if available
    try {
      const stored = localStorage.getItem('thesysChats');
      return stored ? JSON.parse(stored) : [
        {
          id: 'default-chat',
          title: 'Default Chat',
          messages: [],
          lastResponseVector: null
        }
      ];
    } catch (err) {
      // Fallback to a single default chat if error
      return [
        {
          id: 'default-chat',
          title: 'Default Chat',
          messages: [],
          lastResponseVector: null
        }
      ];
    }
  });

  const [activeChatId, setActiveChatId] = useState(chats[0].id);
  const [inputText, setInputText] = useState('');
  
  // -----------------------------------------------
  // Must keep the next line EXACTLY at line 152
  // -----------------------------------------------
  const [isGenerating, setIsGenerating] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const messageIdRef = useRef(0);
  const { currentUser } = useAuth();
  const cancelToken = useRef(null);

  // Additional features:
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Always scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chats, activeChatId]);

  // Persist chats to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('thesysChats', JSON.stringify(chats));
    } catch (err) {
      // Ignore errors setting local storage
      console.error('Failed to save chats to localStorage:', err);
    }
  }, [chats]);

  /* ---------------- Helpers ---------------- */
  const getActiveChat = () => chats.find((c) => c.id === activeChatId);

  const updateChat = (chatId, updates) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, ...updates } : c))
    );
  };

  const addMessageToActiveChat = (sender, text) => {
    const activeChat = getActiveChat();
    if (!activeChat) return;

    const newMessage = {
      id: `msg-${messageIdRef.current++}-${Date.now()}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
      pinned: false
    };

    updateChat(activeChatId, {
      messages: [...activeChat.messages, newMessage]
    });
  };

  /* ---------------- API Interactions ---------------- */
  const handleSend = async () => {
    if (!inputText.trim()) return;
    const limitedMessage = inputText.trim().slice(0, 500);

    addMessageToActiveChat('User', limitedMessage);
    setInputText('');

    try {
      setIsGenerating(true);

      const activeChat = getActiveChat();
      const payload = {
        message: limitedMessage,
        user_id: currentUser?.uid || 'anonymous',
        previous_context_vector: activeChat?.lastResponseVector || null
      };

      const source = axios.CancelToken.source();
      cancelToken.current = source;

      const response = await axios.post('http://127.0.0.1:5000/api/chat', payload, {
        cancelToken: source.token,
        headers: { 'Content-Type': 'application/json' }
      });

      const { data } = response;
      const { text = '', error, response_vector } = data;

      if (response_vector) {
        updateChat(activeChatId, { lastResponseVector: response_vector });
      }

      if (error) {
        addMessageToActiveChat('Thesys', `Error: ${error}`);
      } else {
        addMessageToActiveChat('Thesys', formatResponse(text));
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        addMessageToActiveChat('Thesys', 'Response generation cancelled.');
      } else {
        addMessageToActiveChat('Thesys', `Error: ${err.message}`);
      }
      updateChat(activeChatId, { lastResponseVector: null });
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
      addMessageToActiveChat('Thesys', statusMsg);
    } catch (err) {
      addMessageToActiveChat('Thesys', `Error uploading file: ${err.message}`);
    }
  };

  /* ---------------- Multi-Chat Functions ---------------- */
  const createNewChat = () => {
    const newId = `chat-${Date.now()}`;
    setChats((prev) => [
      ...prev,
      {
        id: newId,
        title: `Chat ${prev.length + 1}`,
        messages: [],
        lastResponseVector: null
      }
    ]);
    setActiveChatId(newId);
  };

  const renameChat = (chatId, newTitle) => {
    updateChat(chatId, { title: newTitle });
  };

  const deleteChat = (chatId) => {
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (chatId === activeChatId && chats.length > 1) {
      // Switch to first chat in list
      const remaining = chats.filter((c) => c.id !== chatId);
      setActiveChatId(remaining[0].id);
    } else if (chats.length === 1) {
      // If that was the only chat, create a fresh one
      createNewChat();
    }
  };

  /* ---------------- Additional Features ---------------- */
  // Toggle pinned state
  const handlePinToggle = (messageId) => {
    const activeChat = getActiveChat();
    if (!activeChat) return;
    const updatedMessages = activeChat.messages.map((m) =>
      m.id === messageId ? { ...m, pinned: !m.pinned } : m
    );
    updateChat(activeChatId, { messages: updatedMessages });
  };

  // Filter function for search bar
  const filterMessages = () => {
    const activeChat = getActiveChat();
    if (!activeChat) return [];
    if (!searchQuery.trim()) {
      return activeChat.messages;
    }
    const query = searchQuery.toLowerCase();
    return activeChat.messages.filter((m) => m.text.toLowerCase().includes(query));
  };

  // Pinned messages
  const pinnedMessages = () => {
    const activeChat = getActiveChat();
    if (!activeChat) return [];
    return activeChat.messages.filter((m) => m.pinned);
  };

  // Download chat as text
  const downloadChatAsText = () => {
    const activeChat = getActiveChat();
    if (!activeChat) return;
    let content = `Chat Title: ${activeChat.title}\n\n`;
    activeChat.messages.forEach((m) => {
      const time = new Date(m.timestamp).toLocaleString();
      content += `[${time}] ${m.sender}: ${m.text}\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeChat.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---------------- Rendering ---------------- */
  return (
    <div className="flex flex-row h-screen bg-gray-100">
      {/* Sidebar for multiple chats */}
      <div className="w-64 flex flex-col border-r bg-white">
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="text-xl font-bold text-gray-800">Chats</h2>
          <button
            onClick={createNewChat}
            className="bg-[#4B8795] text-white p-2 rounded-md hover:bg-[#407986] transition"
            title="Start new chat"
          >
            <FiPlus />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b ${
                chat.id === activeChatId ? 'bg-[#F0F4F6]' : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-medium text-sm mr-2 truncate">
                {chat.title}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTitle = prompt('Enter new chat title:', chat.title);
                    if (newTitle) renameChat(chat.id, newTitle);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  title="Rename chat"
                >
                  <FiEdit />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="text-gray-500 hover:text-red-500"
                  title="Delete chat"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4B8795] to-[#407986] p-4 text-white">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold">Thesys Chat</h1>
              <p className="text-sm opacity-90">Multi-Session Research Assistant</p>
            </div>
            <div className="flex items-center gap-2">
              {/* File upload */}
              <label className="inline-flex items-center px-3 py-2 bg-[#F0F4F6] rounded text-sm text-gray-700 hover:bg-gray-200 transition cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  disabled={isGenerating}
                />
                <FiUpload className="mr-1" />
                Upload
              </label>
              {/* Download chat */}
              <button
                onClick={downloadChatAsText}
                className="bg-[#F0F4F6] text-gray-700 p-2 rounded hover:bg-gray-200 transition"
                title="Download this chat"
              >
                <FiDownload />
              </button>
            </div>
          </div>
        </div>

        {/* Search & pinned messages */}
        <div className="p-3 bg-white flex items-center border-b gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute top-2 left-2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 w-full rounded border focus:outline-none focus:ring-2 focus:ring-[#4B8795]"
              placeholder="Search messages..."
            />
          </div>
          {pinnedMessages().length > 0 && (
            <div className="flex items-center">
              <FiStar className="text-yellow-500 mr-1" />
              <span className="text-sm text-gray-600">
                {pinnedMessages().length} pinned
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
          {filterMessages().map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onPinToggle={handlePinToggle}
            />
          ))}
        </div>

        {/* Input area */}
        <div className="border-t p-3 bg-[#F0F4F6] flex items-center relative">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow p-2 rounded-lg border bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4B8795]"
            placeholder="Type your message..."
            disabled={!activeChatId}
          />
          <button
            onClick={isGenerating ? () => cancelToken?.current?.cancel() : handleSend}
            disabled={!inputText.trim() && !isGenerating}
            className={`ml-2 py-2 px-3 rounded-lg transition ${
              isGenerating
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#4B8795] hover:bg-[#407986] text-white'
            } disabled:opacity-50`}
          >
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <AiOutlineLoading3Quarters className="animate-spin" />
                Stop
              </span>
            ) : (
              <FiSend />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}