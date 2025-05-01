// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FiSend, FiUpload, FiPlus, FiEdit, FiTrash2, FiSearch, FiStar, FiDownload, FiRefreshCw, FiMessageSquare, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import MessageBubble from '../components/MessageBubble'; // Import the separate component
import { addActivity, ACTIVITY_TYPES } from '../utils/activityTracker';
import { useSubscription } from '../context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';


const formatResponse = (text) => {
  if (!text) return 'No response.';
  // Simple check for code blocks
  if (!text.includes('```') && (text.toLowerCase().includes('function') || text.toLowerCase().includes('class'))) {
    return `\`\`\`\n${text}\n\`\`\``;
  }
  return text;
};

// MessageBubble component is now properly imported at the top of the file

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
  const [isCollapsed, setIsCollapsed] = useState(false);
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

  const { canSendMessage, incrementMessageCount, hasFeature, getRemainingMessages, currentPlan, PLAN_TYPES } = useSubscription();
  const navigate = useNavigate();

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
    if (!inputText.trim() || isGenerating) return;
    
    // Check if user can send message
    if (!canSendMessage()) {
      addMessageToActiveChat('System', `You've reached your daily message limit for the ${currentPlan} plan. Upgrade to send more messages.`);
      return;
    }

    const limitedMessage = inputText.trim().slice(0, 500);

    // Add user message
    addMessageToActiveChat('User', limitedMessage);
    setInputText('');

    try {
      setIsGenerating(true);
      incrementMessageCount(); // Increment message count only after successful send

      const activeChat = getActiveChat();
      const payload = {
        message: limitedMessage,
        user_id: currentUser?.uid || 'anonymous',
        previous_context_vector: activeChat?.lastResponseVector || null,
        temperature: 0.7
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
        const responseText = text || '';
        const assistantMessage = {
          id: Date.now(),
          sender: 'Assistant',
          text: '',
          timestamp: new Date().toISOString(),
          raw_data: data.raw_data || null,
          isTyping: true,
        };

        const activeChat = getActiveChat();
        if (activeChat) {
          updateChat(activeChatId, {
            messages: [...activeChat.messages, assistantMessage]
          });
          
          await typeMessage(responseText, assistantMessage.id);
        }
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        addMessageToActiveChat('Thesys', 'Response generation cancelled.');
      } else {
        console.error("API call error:", err);
        addMessageToActiveChat('Thesys', `Error: ${err.message}`);
      }
      updateChat(activeChatId, { lastResponseVector: null });
    } finally {
      setIsGenerating(false);
      cancelToken.current = null;
    }
  };

  const typeMessage = async (text, messageId) => { // Accept messageId
    setIsGenerating(true);
    let messageToType = '';
    if (typeof text === 'string') {
      messageToType = text;
    } else {
      messageToType = "Received unexpected response format.";
      console.error("typeMessage received non-string:", text);
    }

    if (!messageToType?.trim()) {
      messageToType = "I apologize, but I couldn't generate a proper response. Please try again.";
    }

    // Find the message to update
    const activeChat = getActiveChat();
    if (!activeChat) {
      console.warn("No active chat found for typing message");
      setIsGenerating(false);
      return;
    }
    
    // Find the message index
    const messageIndex = activeChat.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      console.warn("Could not find message to type into:", messageId);
      // Instead of returning, create a new message
      const newMessage = {
        id: messageId,
        sender: 'Assistant',
        text: messageToType,
        timestamp: new Date().toISOString(),
        isTyping: false
      };
      
      updateChat(activeChatId, {
        messages: [...activeChat.messages, newMessage]
      });
      setIsGenerating(false);
      return;
    }

    let typedText = '';
    for (let i = 0; i < messageToType.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 20)); // Typing speed
      typedText += messageToType[i];

      // Update the specific message in state
      const updatedMessages = [...activeChat.messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        text: typedText,
      };
      
      updateChat(activeChatId, { messages: updatedMessages });
      
      // Scroll logic remains the same
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }

    // Final update to remove typing indicator
    const finalMessages = [...activeChat.messages];
    finalMessages[messageIndex] = {
      ...finalMessages[messageIndex],
      text: messageToType, // Ensure full text is set
      isTyping: false, // Remove typing flag
    };
    
    updateChat(activeChatId, { messages: finalMessages });
    setIsGenerating(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    if (!hasFeature('document-upload')) {
      addMessageToActiveChat('System', 'Document upload is a premium feature. Please upgrade your plan to use this feature.');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Track file upload immediately
    console.log('File selected for upload:', file.name);
    addActivity(ACTIVITY_TYPES.FILE_DOWNLOADED, {
      fileName: file.name,
      fileType: file.type,
      size: file.size
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', currentUser?.uid || 'anonymous');

      const uploadRes = await axios.post('http://127.0.0.1:5000/api/papers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data.error) {
        addMessageToActiveChat('Thesys', `Upload failed: ${uploadRes.data.error}`);
      } else {
        addMessageToActiveChat('Thesys', `Successfully uploaded ${file.name}`);
      }
    } catch (err) {
      addMessageToActiveChat('Thesys', `Error uploading file: ${err.message}`);
    }
  };

  /* ---------------- Multi-Chat Functions ---------------- */
  const createNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newTitle = `Chat ${chats.length + 1}`;
    
    setChats(prev => [...prev, {
      id: newId,
      title: newTitle,
      messages: [],
      lastResponseVector: null
    }]);
    
    setActiveChatId(newId);
    
    // Track chat creation
    console.log('Creating new chat:', newTitle);
    addActivity(ACTIVITY_TYPES.CHAT_STARTED, {
      chatId: newId,
      title: newTitle
    });
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

  // Add handler for paper likes
  const handlePaperLike = (paperId, paperTitle) => {
    console.log('Paper liked:', paperId, paperTitle);
    addActivity(ACTIVITY_TYPES.ARTICLE_LIKED, {
      paperId,
      title: paperTitle
    });
  };

  /* ---------------- Rendering ---------------- */
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar for multiple chats */}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} flex flex-col border-r border-border bg-card transition-all duration-300`}>
        <div className="p-4 flex items-center justify-between border-b border-border">
          {!isCollapsed && <h2 className="text-lg font-semibold text-foreground">Chats</h2>}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="btn-secondary p-2 rounded-md"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
            </button>
            <button
              onClick={createNewChat}
              className="btn-primary p-2 rounded-md"
              title="Start new chat"
            >
              <FiPlus />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b border-border/50 transition-colors
                ${chat.id === activeChatId 
                  ? 'btn-primary' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              <div className="flex items-center gap-2">
                <FiMessageSquare size={16} />
                {!isCollapsed && (
                  <span className="font-medium text-sm truncate">
                    {chat.title}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newTitle = prompt('Enter new chat title:', chat.title);
                      if (newTitle) renameChat(chat.id, newTitle);
                    }}
                    className="opacity-60 hover:opacity-100"
                    title="Rename chat"
                  >
                    <FiEdit size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="opacity-60 hover:opacity-100"
                    title="Delete chat"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {getActiveChat()?.title || 'New Chat'}
              </h1>
              <p className="text-sm text-muted-foreground">
                AI Research Assistant
                {currentPlan !== PLAN_TYPES.PRO && (
                  <span className="ml-2 text-primary">
                    ({getRemainingMessages()} messages remaining today)
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* File upload */}
              {hasFeature('document-upload') ? (
                <label className="btn-secondary px-3 py-2 rounded-md cursor-pointer inline-flex items-center">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt"
                    onChange={handleFileUpload}
                    disabled={isGenerating}
                  />
                  <FiUpload className="mr-2" />
                  Upload
                </label>
              ) : (
                <button
                  onClick={() => addMessageToActiveChat('System', 'Document upload is a premium feature. Please upgrade your plan to use this feature.')}
                  className="btn-secondary px-3 py-2 rounded-md opacity-50 cursor-not-allowed"
                  title="Premium feature"
                >
                  <FiUpload className="mr-2" />
                  Upload
                </button>
              )}
              
              {/* Download chat - premium feature */}
              {hasFeature('citation-export') ? (
                <button
                  onClick={downloadChatAsText}
                  className="btn-secondary p-2 rounded-md"
                  title="Download this chat"
                >
                  <FiDownload />
                </button>
              ) : (
                <button
                  onClick={() => addMessageToActiveChat('System', 'Chat export is a premium feature. Please upgrade your plan to use this feature.')}
                  className="btn-secondary p-2 rounded-md opacity-50 cursor-not-allowed"
                  title="Premium feature"
                >
                  <FiDownload />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search & pinned messages */}
        <div className="border-b border-border bg-card/50 p-3 flex items-center gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full bg-background border border-input rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search messages..."
            />
          </div>
          {pinnedMessages().length > 0 && (
            <div className="flex items-center text-muted-foreground">
              <FiStar className="text-primary mr-1" />
              <span className="text-sm">
                {pinnedMessages().length} pinned
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {filterMessages().map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'Assistant' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`group relative max-w-[80%] rounded-lg px-4 py-2 ${
                  message.sender === 'Assistant'
                    ? 'bg-card text-card-foreground border border-border'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {/* Message actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handlePinToggle(message.id)}
                    className={`p-1 rounded-md transition-colors ${
                      message.pinned 
                        ? 'text-primary bg-primary/10' 
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <FiStar size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-card text-card-foreground border border-border rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <FiRefreshCw className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Add upgrade prompt for free users */}
        {currentPlan === PLAN_TYPES.FREE && (
          <div className="border-t border-border bg-primary/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">
                  Upgrade to unlock premium features:
                </p>
                <p className="text-xs text-muted-foreground">
                  Unlimited messages, document upload, chat export, and more!
                </p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="btn-primary px-4 py-2 text-sm"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }} className="border-t border-border bg-card p-4">
          <div className="flex space-x-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={canSendMessage() 
                ? "Type your message..." 
                : `Daily message limit reached. Upgrade to send more messages.`
              }
              className={`flex-1 bg-background border border-input rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring ${
                !canSendMessage() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!activeChatId || !canSendMessage() || isGenerating}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isGenerating || !activeChatId || !canSendMessage()}
              className={`px-4 py-2 rounded-md transition-colors ${
                !canSendMessage()
                  ? 'btn-secondary opacity-50 cursor-not-allowed'
                  : isGenerating
                  ? 'btn-destructive'
                  : 'btn-primary'
              }`}
              onClick={isGenerating ? () => cancelToken?.current?.cancel() : undefined}
              title={!canSendMessage() ? "Daily message limit reached" : undefined}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <AiOutlineLoading3Quarters className="animate-spin" />
                  Stop
                </span>
              ) : (
                <FiSend />
              )}
            </button>
          </div>
          {!canSendMessage() && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive font-medium">
                You've reached your daily message limit.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Upgrade your plan to send more messages or wait until tomorrow.
              </p>
              <button
                onClick={() => navigate('/settings#subscription-plans')}
                className="btn-primary mt-3 px-4 py-2 text-sm"
              >
                Upgrade Now
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}