import React, { useState, useEffect } from 'react';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState(() => {
    const savedChats = sessionStorage.getItem('chats');
    return savedChats ? JSON.parse(savedChats) : [{
      id: 'default',
      name: 'Untitled Chat',
      history: []
    }];
  });
  const [activeChat, setActiveChat] = useState(() => {
    const savedActiveChat = sessionStorage.getItem('activeChat');
    return savedActiveChat || 'default';
  });
  const [isTyping, setIsTyping] = useState(false);
  const [editingName, setEditingName] = useState(null);
  const [newChatName, setNewChatName] = useState('');

  // Save chats to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  // Save active chat to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('activeChat', activeChat);
  }, [activeChat]);

  const generateResponse = async (userMessage) => {
    // Simple response logic based on keywords
    const message = userMessage.toLowerCase();
    let response = '';

    if (message.includes('hello') || message.includes('hi')) {
      response = "Hello! How can I help you today?";
    } else if (message.includes('help')) {
      response = "I'm here to help! What do you need assistance with?";
    } else if (message.includes('bye')) {
      response = "Goodbye! Have a great day!";
    } else if (message.includes('thank')) {
      response = "You're welcome!";
    } else if (message.includes('weather')) {
      response = "I'm sorry, I don't have access to real-time weather data.";
    } else if (message.includes('name')) {
      response = "I'm Thesys, your AI research assistant!";
    } else if (message.includes('research') || message.includes('paper')) {
      response = "I can help you with research papers! Would you like to search for papers, manage citations, or get paper summaries?";
    } else if (message.includes('citation')) {
      response = "I can help format citations in various styles like APA, MLA, and Chicago. What would you like to cite?";
    } else {
      response = "I understand you're asking about " + userMessage + ". Could you please provide more details or rephrase your question?";
    }

    return new Promise(resolve => {
      setTimeout(() => {
        resolve(response);
      }, 1000);
    });
  };

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      name: 'Untitled Chat',
      history: []
    };
    setChats([...chats, newChat]);
    setActiveChat(newChat.id);
    setEditingName(newChat.id);
    setNewChatName('');
  };

  const startEditingName = (chatId, currentName) => {
    setEditingName(chatId);
    setNewChatName(currentName);
  };

  const saveChatName = () => {
    if (newChatName.trim()) {
      setChats(prev => prev.map(chat => 
        chat.id === editingName 
          ? { ...chat, name: newChatName.trim() }
          : chat
      ));
    }
    setEditingName(null);
    setNewChatName('');
  };

  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveChatName();
    }
  };

  const sendMessage = async () => {
    if (message.trim() !== '') {
      // Add user message
      setChats(prev => prev.map(chat => {
        if (chat.id === activeChat) {
          return {
            ...chat,
            history: [...chat.history, { sender: 'You', text: message }]
          };
        }
        return chat;
      }));

      const userMessage = message;
      setMessage('');
      setIsTyping(true);

      // Get AI response
      const response = await generateResponse(userMessage);

      // Add AI response
      setChats(prev => prev.map(chat => {
        if (chat.id === activeChat) {
          return {
            ...chat,
            history: [...chat.history, { sender: 'Thesys', text: response }]
          };
        }
        return chat;
      }));

      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeHistory = chats.find(chat => chat.id === activeChat)?.history || [];

  return (
    <div className="p-10 mt-10 flex gap-4">
      {/* Sidebar with chat list */}
      <div className="w-64 border-r pr-4">
        <button 
          onClick={createNewChat}
          className="w-full mb-4 bg-black text-white px-4 py-2 rounded hover:bg-gray-700 transition duration-200"
        >
          New Chat
        </button>
        <div className="space-y-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`p-2 rounded ${
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
                  <span 
                    className="cursor-pointer flex-grow"
                    onClick={() => setActiveChat(chat.id)}
                  >
                    {chat.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditingName(chat.id, chat.name);
                    }}
                    className="text-gray-500 hover:text-black ml-2 text-sm"
                  >
                    ✎
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1">
        <h2 className="text-3xl font-bold mb-4">Chat with Thesys AI</h2>

        <div className="border border-gray-300 bg-gray-100 rounded-lg h-[400px] overflow-auto p-4 mb-4">
          {activeHistory.map((msg, idx) => (
            <div key={idx} className={`my-2 ${msg.sender === 'You' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block p-2 rounded-lg ${msg.sender === 'You' ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}>
                <strong>{msg.sender}: </strong>
                {msg.text}
              </span>
            </div>
          ))}
          {isTyping && (
            <div className="text-left">
              <span className="inline-block p-2 rounded-lg bg-gray-200 text-black">
                <strong>Thesys:</strong> typing...
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <textarea
            className="border rounded p-3 flex-grow resize-none"
            placeholder="Type your question here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows="1"
          />
          <button 
            onClick={sendMessage} 
            className="bg-black text-white px-6 rounded hover:bg-gray-700 transition duration-200"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
