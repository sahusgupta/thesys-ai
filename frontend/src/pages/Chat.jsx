import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// Message Bubble Component
const MessageBubble = React.memo(({ sender, text }) => {
  const isUser = sender === 'You';

  return (
    <div className={`my-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
          isUser 
            ? 'bg-[#4B8795] text-white' 
            : 'bg-[#F0F4F6] text-gray-800'
        }`}
      >
        <span className="block text-xs font-bold mb-1 opacity-80">{sender}</span>
        <span className="text-sm leading-snug whitespace-pre-wrap">{text}</span>
      </div>
    </div>
  );
});

export default function Chat() {
  // State Management
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState(() => {
    const savedChats = localStorage.getItem('thesys-chats');
    return savedChats
      ? JSON.parse(savedChats)
      : [{ id: 'default', name: 'Untitled Chat', history: [] }];
  });
  const [activeChat, setActiveChat] = useState(() => 
    localStorage.getItem('thesys-active-chat') || 'default'
  );
  const [isTyping, setIsTyping] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [newChatName, setNewChatName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState({});

  // Refs
  const chatContainerRef = useRef(null);
  const messageInputRef = useRef(null);

  // Persistent Storage
  useEffect(() => {
    localStorage.setItem('thesys-chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('thesys-active-chat', activeChat);
  }, [activeChat]);

  // Auto-scroll effect
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chats, isTyping]);

  // API-based response generation
  const generateResponse = useCallback(async (userMessage) => {
    try {
      setIsTyping(true);
      const response = await axios.post('/api/chat', { 
        message: userMessage,
        chatId: activeChat 
      });
      return response.data.message;
    } catch (error) {
      console.error('Error generating response:', error);
      return 'I encountered an error. Could you please rephrase your message?';
    } finally {
      setIsTyping(false);
    }
  }, [activeChat]);

  // Chat Management Functions
  const createNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newChat = {
      id: newId,
      name: 'Untitled Chat',
      history: [],
    };
    setChats(prev => [...prev, newChat]);
    setActiveChat(newId);
    setEditingName(newId);
    setNewChatName('');
  };

  const deleteChat = (chatId) => {
    if (chats.length > 1) {
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      setActiveChat(chats.find(chat => chat.id !== chatId)?.id || 'default');
    } else {
      alert('You must have at least one chat.');
    }
  };

  const startEditingName = (chatId, currentName) => {
    setEditingName(chatId);
    setNewChatName(currentName);
  };

  const saveChatName = () => {
    if (newChatName.trim()) {
      setChats(prev => 
        prev.map(chat => 
          chat.id === editingName 
            ? { ...chat, name: newChatName.trim() } 
            : chat
        )
      );
    }
    setEditingName(null);
    setNewChatName('');
  };

  // Message Sending Logic
  const sendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Update chat history with user message
    setChats(prev => 
      prev.map(chat => 
        chat.id === activeChat
          ? { 
              ...chat, 
              history: [...chat.history, { sender: 'You', text: trimmedMessage }] 
            }
          : chat
      )
    );

    setMessage('');
    messageInputRef.current?.focus();

    try {
      // Generate AI response
      const aiResponse = await generateResponse(trimmedMessage);

      // Update chat history with AI response
      setChats(prev => 
        prev.map(chat => 
          chat.id === activeChat
            ? { 
                ...chat, 
                history: [
                  ...chat.history, 
                  { sender: 'Thesys', text: aiResponse }
                ] 
              }
            : chat
        )
      );
    } catch (error) {
      alert('Failed to send message');
    }
  };

  // Event Handlers
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Derived Data
  const activeHistory = 
    chats.find(chat => chat.id === activeChat)?.history || [];

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#F0F4F6] border-r p-4 flex flex-col">
        <button 
          onClick={createNewChat}
          className="mb-4 flex items-center gap-2 p-2 bg-[#4B8795] text-white rounded hover:bg-[#407986] transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>

        <div className="space-y-2 overflow-y-auto flex-grow">
          {chats.map(chat => (
            <div 
              key={chat.id}
              className={`
                relative flex justify-between items-center p-2 rounded cursor-pointer 
                ${chat.id === activeChat 
                  ? 'bg-[#4B8795] text-white' 
                  : 'hover:bg-gray-200'
                }
              `}
              onClick={() => setActiveChat(chat.id)}
            >
              {editingName === chat.id ? (
                <input
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  onBlur={saveChatName}
                  onKeyDown={(e) => e.key === 'Enter' && saveChatName()}
                  autoFocus
                  className="w-full p-1 rounded border"
                />
              ) : (
                <span className="flex-grow truncate">{chat.name}</span>
              )}
              
              {editingName !== chat.id && (
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingName(chat.id, chat.name);
                    }}
                    className="text-gray-500 hover:text-white ml-2 text-xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(prev => ({
                          ...prev,
                          [chat.id]: !prev[chat.id]
                        }));
                      }}
                      className="text-gray-500 hover:text-white ml-2 text-xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                      </svg>
                    </button>
                    
                    {isDropdownOpen[chat.id] && (
                      <div 
                        className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-10"
                        onBlur={() => setIsDropdownOpen(prev => ({...prev, [chat.id]: false}))}
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(chat.id);
                            setIsDropdownOpen(prev => ({...prev, [chat.id]: false}));
                          }}
                          className="w-full p-2 text-left text-red-600 hover:bg-red-50"
                        >
                          Delete Chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4B8795] to-[#407986] p-4 text-white">
          <h2 className="text-xl font-bold">Chat with Thesys AI</h2>
          <p className="text-sm opacity-80">Ask questions, explore ideas, or just say hello.</p>
        </div>

        {/* Chat Messages Container */}
        <div 
          ref={chatContainerRef}
          className="flex-grow overflow-y-auto p-4 space-y-2"
        >
          {activeHistory.map((msg, idx) => (
            <MessageBubble 
              key={idx} 
              sender={msg.sender} 
              text={msg.text} 
            />
          ))}
          
          {isTyping && (
            <div className="text-gray-500 italic p-2">
              Thesys is typing...
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="bg-white p-4 border-t flex items-center space-x-2">
          <textarea
            ref={messageInputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-grow p-2 border rounded resize-none"
            rows={1}
          />
          <button 
            onClick={sendMessage} 
            disabled={!message.trim()}
            className="bg-[#4B8795] text-white px-4 py-2 rounded hover:bg-[#407986] disabled:opacity-50 transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}