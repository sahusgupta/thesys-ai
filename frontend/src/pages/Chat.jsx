import React, { useState } from 'react';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const sendMessage = () => {
    if (message.trim() !== '') {
      setChatHistory([...chatHistory, { sender: 'You', text: message }]);
      setMessage('');

      // Simulate AI Response (Replace with backend logic later)
      setTimeout(() => {
        setChatHistory(prev => [
          ...prev,
          { sender: 'Thesys', text: 'AI is processing your request...' }
        ]);
      }, 1000);
    }
  };

  return (
    <div className="p-10 mt-10">
      <h2 className="text-3xl font-bold mb-4">Chat with Thesys AI</h2>

      <div className="border border-gray-300 bg-gray-100 rounded-lg h-[400px] overflow-auto p-4 mb-4">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`my-2 ${msg.sender === 'You' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${msg.sender === 'You' ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}>
              <strong>{msg.sender}: </strong>{msg.text}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="border rounded p-3 flex-grow"
          placeholder="Type your question here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage} className="bg-black text-white px-6 rounded hover:bg-gray-700 transition duration-200">
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
