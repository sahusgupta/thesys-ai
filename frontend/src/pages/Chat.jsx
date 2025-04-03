// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

/**
 * Minimal chat bubble component
 */
const MessageBubble = React.memo(({ sender, text }) => {
  const isUser = sender === 'User';
  return (
    <div className={`my-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
          isUser
            ? 'bg-[#4B8795] text-white'
            : 'bg-[#F0F4F6] text-gray-800'
        }`}
      >
        <span className="block text-xs font-bold mb-1 opacity-80">
          {sender}
        </span>
        <span className="text-sm leading-snug whitespace-pre-wrap">
          {text}
        </span>
      </div>
    </div>
  );
});

/**
 * The main Chat component. 
 * - Allows toggling between single-step (/api/chat) or advanced multi-step (/api/advanced_workflow).
 * - Renders messages in a scrollable area.
 */
export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState(null);
  const [useAdvancedFlow, setUseAdvancedFlow] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // On first load, generate a random chat ID (or do so on server)
  useEffect(() => {
    if (!chatId) {
      const generatedId = `chat-${Date.now()}`;
      setChatId(generatedId);
    }
  }, [chatId]);

  /**
   * Helper to add a message to local state
   */
  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  /**
   * Send the user input to the server
   */
  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Add the user's message to local chat
    addMessage('User', trimmed);
    setInputText('');

    try {
      let endpoint = 'http://127.0.0.1:5000/api/chat';
      if (useAdvancedFlow) {
        endpoint = 'http://127.0.0.1:5000/api/advanced_workflow';
      }

      // Post the message
      const payload = {
        message: trimmed
      };
      if (!useAdvancedFlow) {
        // If single-step, we also pass the chatId
        payload.chatId = chatId;
      }

      const response = await axios.post(endpoint, payload);
      const data = response.data;

      // Parse the server's response
      let assistantText = '';

      if (useAdvancedFlow) {
        // For advanced workflow, data might look like:
        // {
        //   "scholar_data": {...},
        //   "factcheck_data": {...},
        //   "citation_data": {...},
        //   "context_data": {...}
        //   or "error": "..."
        // }
        if (data.error) {
          assistantText = `Error: ${data.error}`;
        } else {
          // We can create a short summary
          assistantText += '[Scholar Results]\n';
          assistantText += JSON.stringify(data.scholar_data, null, 2) + '\n\n';
          assistantText += '[FactCheck Results]\n';
          assistantText += JSON.stringify(data.factcheck_data, null, 2) + '\n\n';
          assistantText += '[Citation Results]\n';
          assistantText += JSON.stringify(data.citation_data, null, 2) + '\n\n';
          assistantText += '[Context Results]\n';
          assistantText += JSON.stringify(data.context_data, null, 2);
        }
      } else {
        // Single-step data might look like:
        // { message: {summary:..., citations:..., sources:...}, chatId: ...}
        if (data.error) {
          assistantText = `Error: ${data.error}`;
        } else {
          // data.message might be the final_report from the orchestrator
          // which is a dict: { summary:..., citations:..., sources:... }
          const finalReport = data.message;
          if (typeof finalReport === 'string') {
            // Possibly the orchestrator returned a string
            assistantText = finalReport;
          } else {
            // If it's a dict, let's format it
            assistantText = JSON.stringify(finalReport, null, 2);
          }
        }
      }

      addMessage('Thesys', assistantText);
    } catch (err) {
      console.error('Failed to send message:', err);
      addMessage('Thesys', `Error: ${err.message}`);
    }
  };

  const handleEnterKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4B8795] to-[#407986] p-4 text-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Thesys Chat</h1>
          <p className="text-sm opacity-80">Multi-agent AI Chat with Orchestrator & ACP</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="advancedToggle" className="text-sm">
            Advanced Flow
          </label>
          <input
            id="advancedToggle"
            type="checkbox"
            className="h-4 w-4"
            checked={useAdvancedFlow}
            onChange={(e) => setUseAdvancedFlow(e.target.checked)}
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} sender={msg.sender} text={msg.text} />
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t p-4 flex items-center space-x-2">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleEnterKey}
          rows={1}
          placeholder="Type your message..."
          className="flex-grow p-2 border rounded resize-none text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={!inputText.trim()}
          className="bg-[#4B8795] text-white px-4 py-2 rounded hover:bg-[#407986] disabled:opacity-50 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
