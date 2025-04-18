import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import { useNavigate } from 'react-router-dom'; // To redirect after delete

// Helper function to apply theme class
const applyTheme = (theme) => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark'); // Remove existing theme classes

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
};

// Define theme color from Home.jsx
const themeColor = "#4B8795";
// Define a hover color (slightly darker version of themeColor)
const themeColorHover = "#407986"; // You might need to adjust this

function Settings() {
  const { currentUser, updateUserProfile, updateUserPassword, logout } = useAuth(); // Get functions/user data
  const navigate = useNavigate();

  // --- State Variables ---
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system'); // Theme state
  // Temperature State - Default 0.7, range 0.0 to 1.0
  const [temperature, setTemperature] = useState(() => {
    const savedTemp = localStorage.getItem('ai_temperature');
    return savedTemp ? parseFloat(savedTemp) : 0.7;
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false); // Added loading for delete

  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState(''); // Added message for delete

  // --- Effects ---
  // Load current user data on mount
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.displayName || '');
      // Email is already disabled and populated via placeholder/value from context potentially
    }
  }, [currentUser]);

  // Effect to apply and manage theme changes
  useEffect(() => {
    applyTheme(theme); // Apply theme on initial load and theme state change

    // Listener for system theme changes if 'system' is selected
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    if (theme === 'system') {
      mediaQuery.addEventListener('change', handleChange);
    }

    // Cleanup listener on component unmount or if theme changes from 'system'
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]); // Rerun effect when theme state changes

  // --- Handlers ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage(''); // Clear previous message
    if (name === currentUser.displayName) {
      setProfileMessage('Name has not changed.');
      return; // No need to update if name hasn't changed
    }

    setProfileLoading(true);
    try {
      await updateUserProfile({ displayName: name });
      setProfileMessage('Profile updated successfully!');
    } catch (error) {
      console.error("Profile update error:", error);
      setProfileMessage(`Failed to update profile: ${error.message}`);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(''); // Clear previous message

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      return;
    }
    if (!newPassword) {
      setPasswordMessage('New password cannot be empty.');
      return;
    }

    // ** IMPORTANT: Add re-authentication logic here in production! **
    // Example: Prompt for current password again, verify it, then proceed.
    // const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    // await reauthenticateWithCredential(currentUser, credential);

    setPasswordLoading(true);
    try {
      await updateUserPassword(newPassword);
      setPasswordMessage('Password updated successfully!');
      // Clear password fields after successful update
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error("Password update error:", error);
      // Provide more specific feedback if possible (e.g., weak password)
      setPasswordMessage(`Failed to update password: ${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteMessage(''); // Clear previous message
    if (!window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setDeleteLoading(true);
    try {
      // ** Placeholder - Actual deletion logic needed in AuthContext/backend **
      // This example assumes you have a deleteUserAccount function in your context
      // await deleteUserAccount(); // Replace with your actual function
      alert('Account deletion functionality is not yet implemented.');
      // If deletion was successful, logout and redirect
      // await logout();
      // navigate('/login');
      setDeleteMessage('Account deletion initiated (placeholder).'); // Update message
    } catch (error) {
      console.error("Account deletion error:", error);
      setDeleteMessage(`Failed to delete account: ${error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Theme change handler
  const handleThemeChange = (newTheme) => {
    localStorage.setItem('theme', newTheme); // Save preference
    setTheme(newTheme); // Update state (triggers useEffect)
  };

  // Temperature change handler
  const handleTemperatureChange = (e) => {
    const newTemp = parseFloat(e.target.value);
    setTemperature(newTemp);
    localStorage.setItem('ai_temperature', newTemp.toString());
  };

  // Subscription management handler (placeholder)
  const handleManageSubscription = () => {
    alert('Redirecting to subscription portal... (implementation needed)');
    // Example: window.location.href = 'YOUR_STRIPE_PORTAL_URL';
  };

  // Display loading state if user data isn't loaded yet
  if (!currentUser) {
      return <div>Loading user data...</div>;
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl dark:bg-gray-900"> {/* Added max-width and dark mode background */}
      <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-8">Settings</h1> {/* Adjusted heading color for dark mode */}

      {/* Profile Information Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-5">Profile Information</h2> {/* Adjusted text color */}
        {profileMessage && (
          <p className={`mb-4 text-sm ${profileMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {profileMessage}
          </p>
        )}
        <form onSubmit={handleUpdateProfile}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-70"
              disabled={profileLoading}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              id="email"
              value={currentUser.email || ''} // Use currentUser email
              placeholder="your.email@example.com"
              disabled // Keep disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-400"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed via settings.</p>
          </div>
          <button
            type="submit"
            disabled={profileLoading || name === currentUser.displayName} // Disable if loading or name unchanged
            className="px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: themeColor,
              '--hover-bg-color': themeColorHover
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColorHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColor}
          >
            {profileLoading ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-5">Change Password</h2> {/* Adjusted text color */}
        {passwordMessage && (
          <p className={`mb-4 text-sm ${passwordMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {passwordMessage}
          </p>
        )}
        <form onSubmit={handleChangePassword}>
          <div className="mb-4">
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-70"
              disabled={passwordLoading}
              required // Make required if needed for re-auth (currently not used)
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Required for security (implementation recommended).</p>
          </div>
          <div className="mb-4">
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-70"
              disabled={passwordLoading}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-70"
              disabled={passwordLoading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-teal-500 disabled:opacity-50"
            style={{
              backgroundColor: themeColor,
              '--hover-bg-color': themeColorHover
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColorHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeColor}
          >
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Appearance Section - Theme & Temperature */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-5">Preferences</h2>
        <fieldset className="mb-6">
          <legend className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Theme</legend>
          <div className="space-y-2">
            {['light', 'dark', 'system'].map((themeOption) => (
              <div key={themeOption} className="flex items-center">
                <input
                  id={`theme-${themeOption}`}
                  name="theme"
                  type="radio"
                  value={themeOption}
                  checked={theme === themeOption}
                  onChange={() => handleThemeChange(themeOption)}
                  className="focus:ring-teal-500 h-4 w-4 text-teal-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-teal-500"
                />
                <label htmlFor={`theme-${themeOption}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {themeOption}
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">AI Response Temperature</label>
          <input
            id="temperature"
            type="range"
            min="0.0"
            max="1.0"
            step="0.1"
            value={temperature}
            onChange={handleTemperatureChange}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
            Value: {temperature.toFixed(1)} 
            <span className="ml-2">({temperature <= 0.5 ? 'More predictable' : temperature >= 0.8 ? 'More creative' : 'Balanced'})</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Lower values make the AI output more focused and deterministic. Higher values make it more creative and random.
          </p>
        </fieldset>
      </div>

      {/* Subscription Management Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-4">Subscription</h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your current plan: <span className="font-medium">Free Tier</span> {/* Replace with dynamic data */}
          </p>
          {/* Add more details here if needed, e.g., usage limits, renewal date */} 
        </div>
        <button
          onClick={handleManageSubscription}
          className="px-4 py-2 border border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400 rounded-md hover:bg-teal-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-teal-500"
        >
          Manage Subscription
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          You will be redirected to our payment provider to manage your subscription details.
        </p>
      </div>

      {/* Delete Account Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-red-300 dark:border-red-500"> {/* Danger zone styling */}
        <h2 className="text-xl font-medium text-red-700 dark:text-red-400 mb-4">Danger Zone</h2>
        {deleteMessage && (
          <p className={`mb-4 text-sm ${deleteMessage.includes('success') || deleteMessage.includes('placeholder') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
             {/* Adjusted message display */}
             {deleteMessage}
          </p>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Deleting your account is permanent and cannot be undone. All your data associated with this account will be removed.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleteLoading}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-red-500 disabled:opacity-50"
        >
          {deleteLoading ? 'Deleting...' : 'Delete My Account'}
        </button>
      </div>

    </div>
  );
}

export default Settings;
