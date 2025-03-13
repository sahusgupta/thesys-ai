import React, { useState } from 'react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  
  const [appearance, setAppearance] = useState({
    theme: 'light',
    animations: true,
  });

  const [features, setFeatures] = useState({
    chatAssistant: true,
    dashboard: true,
    citations: true,
    semanticSearch: true,
    researchLibrary: true,
  });

  const updateAppearance = (e) => {
    const { name, value, type, checked } = e.target;
    setAppearance(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const toggleFeature = (feature) => {
    setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
  };

  return (
    <div className="max-w-5xl mx-auto p-10 mt-12">
      <h2 className="text-4xl font-bold mb-6">⚙️ Settings</h2>

      {/* Tabs Navigation */}
      <nav className="flex gap-4 border-b mb-6">
        {['General', 'Dashboard', 'Upload', 'Search', 'Chat', 'Citations', 'Library', 'Appearance'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 px-4 ${
              activeTab === tab ? 'border-b-2 border-black font-bold' : 'text-gray-500'
            } transition duration-200`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* General Settings Tab */}
      {activeTab === 'General' && (
        <section className="bg-gray-50 rounded-xl shadow-md p-8">
          <h3 className="text-2xl font-bold">🔑 API Configuration</h3>
          <input
            className="mt-4 border rounded w-full p-3"
            placeholder="Enter your API key here"
          />
          <button className="mt-4 bg-black text-white px-6 py-3 rounded hover:bg-gray-700 transition">Save API Key</button>
        </section>
      )}

      {/* Appearance Settings */}
      {activeTab === 'Appearance' && (
        <div className="bg-gray-50 rounded-xl shadow-md p-6">
          <h3 className="text-2xl font-bold mb-4">🎨 Customize Appearance</h3>
          <label className="block font-medium">Theme</label>
          <select
            className="w-full border p-3 mt-2 rounded"
            value={appearance.theme}
            name="theme"
            onChange={updateAppearance}
          >
            <option value="light">Light Mode 🌞</option>
            <option value="dark">Dark Mode 🌜</option>
          </select>
          <label className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              name="animations"
              checked={appearance.animations}
              onChange={updateAppearance}
            /> 
            Enable animations ✨
          </label>
        </div>
      )}

      {/* Chat Assistant Settings */}
      {activeTab === 'Chat Assistant' && (
        <div className="bg-gray-50 p-6 rounded shadow">
          <h3 className="text-2xl font-bold mb-4">💬 Chat Assistant</h3>
          <label className="flex items-center justify-between">
            <span>Enable Chat Assistant</span>
            <input type="checkbox" checked={features.chatAssistant} onChange={() => toggleFeature('chatAssistant')} />
          </label>
        </div>
      )}

      {/* Semantic Search Settings */}
      {activeTab === 'Search' && (
        <div className="bg-gray-50 p-6 rounded shadow">
          <h3 className="text-2xl font-bold mb-4">🔍 Semantic Search</h3>
          <label className="flex justify-between items-center">
            Enable AI-driven search results
            <input type="checkbox" checked={features.semanticSearch} onChange={() => toggleFeature('semanticSearch')}/>
          </label>
        </div>
      )}

      {/* Citations Settings */}
      {activeTab === 'Citations' && (
        <div className="bg-gray-50 p-6 rounded shadow">
          <h3 className="text-2xl font-bold mb-4">📚 Citations</h3>
          <label className="flex justify-between items-center">
            Enable Auto-Citation:
            <input type="checkbox" checked={features.citations} onChange={() => toggleFeature('citations')} />
          </label>
        </div>
      )}

      {/* Dashboard Settings */}
      {activeTab === 'Dashboard' && (
        <div className="bg-gray-50 p-6 rounded shadow">
          <h3 className="text-2xl font-bold mb-4">📊 Dashboard</h3>
          <label className="flex justify-between items-center">
            Show Recent Summaries:
            <input type="checkbox" checked={features.dashboard} onChange={() => toggleFeature('dashboard')}/>
          </label>
        </div>
      )}

      {/* Library Settings */}
      {activeTab === 'Library' && (
        <div className="bg-gray-50 p-6 rounded shadow">
          <h3 className="text-2xl font-bold mb-4">📖 Research Library</h3>
          <label className="flex justify-between items-center">
            Enable Library Saving:
            <input type="checkbox" checked={features.researchLibrary} onChange={() => toggleFeature('researchLibrary')}/>
          </label>
        </div>
      )}

    </div>
  );
};

export default Settings;
