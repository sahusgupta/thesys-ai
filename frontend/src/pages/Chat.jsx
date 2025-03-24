// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState(() => {
    const savedChats = sessionStorage.getItem('chats');
    return savedChats
      ? JSON.parse(savedChats)
      : [
          {
            id: 'default',
            name: 'Untitled Chat',
            history: [],
          },
        ];
  });
  const [activeChat, setActiveChat] = useState(() => {
    const savedActiveChat = sessionStorage.getItem('activeChat');
    return savedActiveChat || 'default';
  });
  const [isTyping, setIsTyping] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [newChatName, setNewChatName] = useState('');

  // Refs
  const chatContainerRef = useRef(null);

  // Save chats whenever they change
  useEffect(() => {
    sessionStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  // Save active chat whenever it changes
  useEffect(() => {
    sessionStorage.setItem('activeChat', activeChat);
  }, [activeChat]);

  // Scroll to bottom whenever new messages or typing status changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chats, isTyping]);

  /** Basic chatbot logic */
  const generateResponse = async (userMessage) => {
    const lowerMsg = userMessage.toLowerCase();
    let response = '';

    if (/\b(hi|hello|hey)\b/.test(lowerMsg)) {
      response = 'Hello there! How can I assist you today?';
    } else if (/\bthanks?\b/.test(lowerMsg)) {
      response = "You're welcome! Anything else I can help with?";
    } else if (/\bbye\b/.test(lowerMsg)) {
      response = 'Goodbye! Have a wonderful day.';
    } else {
      response = `I see you're asking about "${userMessage}". Please tell me more.`;
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(response), 1000);
    });
  };

  /** Chat creation / editing logic */
  const createNewChat = () => {
    const newId = Date.now().toString();
    const newChat = {
      id: newId,
      name: 'Untitled Chat',
      history: [],
    };
    setChats([...chats, newChat]);
    setActiveChat(newId);
    setEditingName(newId);
    setNewChatName('');
  };

  const startEditingName = (chatId, currentName) => {
    setEditingName(chatId);
    setNewChatName(currentName);
  };

  const saveChatName = () => {
    if (newChatName.trim()) {
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === editingName
            ? { ...chat, name: newChatName.trim() }
            : chat
        )
      );
    }
    setEditingName(null);
    setNewChatName('');
  };

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveChatName();
    }
  };

  /** Sending a user message */
  const sendMessage = async () => {
    if (!message.trim()) return;
    const userMessage = message;

    // Add the user's message to the active chat
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === activeChat) {
          return {
            ...chat,
            history: [...chat.history, { sender: 'You', text: userMessage }],
          };
        }
        return chat;
      })
    );

    setMessage('');
    setIsTyping(true);

    // Simulate AI logic
    const response = await generateResponse(userMessage);

    // Add the AI response to the active chat
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === activeChat) {
          return {
            ...chat,
            history: [...chat.history, { sender: 'Thesys', text: response }],
          };
        }
        return chat;
      })
    );
    setIsTyping(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Grab the active chat history
  const activeHistory =
    chats.find((chat) => chat.id === activeChat)?.history || [];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Gradient banner */}
      <div
        className="p-4 md:p-6 text-gray-800 shadow-sm relative overflow-hidden"
        style={{
          background: 'linear-gradient(120deg, #f0f9ff 0%, #e0f4f8 35%, #ffffff 100%)',
        }}
      >
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Chat with Thesys AI</h1>
            <p className="text-sm text-gray-700 max-w-lg">
              Ask questions, explore ideas, or just say hello.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 flex gap-4">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r pr-4 py-3 rounded shadow-sm hidden md:block">
          <button
            onClick={createNewChat}
            className="w-full mb-4 bg-[#4B8795] text-white px-4 py-2 rounded hover:bg-[#407986] transition text-sm"
          >
            New Chat
          </button>
          <div className="space-y-2 text-sm">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`p-2 rounded cursor-pointer ${
                  chat.id === activeChat ? 'bg-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                {editingName === chat.id ? (
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    onBlur={saveChatName}
                    onKeyPress={handleNameKeyPress}
                    className="w-full p-1 rounded border"
                    autoFocus
                  />
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="flex-grow">{chat.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingName(chat.id, chat.name);
                      }}
                      className="text-gray-500 hover:text-black ml-2 text-xs"
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Fixed-size chat container with scrollbar */}
          <div
            ref={chatContainerRef}
            className="border border-gray-300 bg-gradient-to-br from-gray-100 via-white to-gray-100 
                       rounded-lg p-4 mb-4 h-[500px] overflow-y-auto transition"
          >
            {activeHistory.map((msg, idx) => (
              <MessageBubble key={idx} sender={msg.sender} text={msg.text} />
            ))}
            {isTyping && (
              <div className="my-2 text-left">
                <span className="inline-block p-2 rounded-lg bg-gray-200 text-black">
                  <strong>Thesys:</strong> typing...
                </span>
              </div>
            )}
          </div>

          {/* Message input */}
          <div className="flex gap-2">
            <textarea
              className="border rounded p-2 flex-grow resize-none text-sm focus:outline-none focus:ring focus:ring-[#4B8795]/50"
              placeholder="Type your question here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows="1"
            />
            <button
              onClick={sendMessage}
              className="bg-[#4B8795] text-white px-6 py-2 rounded hover:bg-[#407986] transition duration-200 text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Single message bubble with a brand-themed style.
 */
function MessageBubble({ sender, text }) {
  const isUser = sender === 'You';

  return (
    <div className={`my-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] p-2 rounded-lg shadow-sm ${
          isUser ? 'bg-[#4B8795] text-white' : 'bg-white border'
        }`}
      >
        <span className="block text-xs font-bold mb-1">{sender}</span>
        <span className="text-sm leading-snug whitespace-pre-wrap">{text}</span>
      </div>
    </div>
  );
}
