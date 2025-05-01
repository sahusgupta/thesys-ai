import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import SubscriptionPlans from '../components/SubscriptionPlans';
import { useSubscription } from '../context/SubscriptionContext';

// Define theme color from Home.jsx
const themeColor = "#4B8795";
// Define a hover color (slightly darker version of themeColor)
const themeColorHover = "#407986";

function Settings() {
  const { currentUser, updateUserProfile, updateUserPassword, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { currentPlan, getRemainingMessages, PLAN_TYPES } = useSubscription();

  // --- State Variables ---
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Temperature State - Default 0.7, range 0.0 to 1.0
  const [temperature, setTemperature] = useState(() => {
    const savedTemp = localStorage.getItem('ai_temperature');
    return savedTemp ? parseFloat(savedTemp) : 0.7;
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');

  // --- Effects ---
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.displayName || '');
    }
  }, [currentUser]);

  // --- Handlers ---
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    if (name === currentUser.displayName) {
      setProfileMessage('Name has not changed.');
      return;
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
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      return;
    }
    if (!newPassword) {
      setPasswordMessage('New password cannot be empty.');
      return;
    }

    setPasswordLoading(true);
    try {
      await updateUserPassword(newPassword);
      setPasswordMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error("Password update error:", error);
      setPasswordMessage(`Failed to update password: ${error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteMessage('');
    if (!window.confirm("Are you absolutely sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    setDeleteLoading(true);
    try {
      alert('Account deletion functionality is not yet implemented.');
      setDeleteMessage('Account deletion initiated (placeholder).');
    } catch (error) {
      console.error("Account deletion error:", error);
      setDeleteMessage(`Failed to delete account: ${error.message}`);
    } finally {
      setDeleteLoading(false);
    }
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
  };

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">Loading user data...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-semibold text-foreground mb-8">Settings</h1>

        {/* Subscription Status */}
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-foreground">
                  {currentPlan === PLAN_TYPES.FREE ? 'Free Plan' :
                   currentPlan === PLAN_TYPES.STUDENT ? 'Student Plan' :
                   'Pro Plan'}
                </p>
                {currentPlan !== PLAN_TYPES.PRO && (
                  <p className="text-sm text-muted-foreground">
                    {getRemainingMessages()} messages remaining today
                  </p>
                )}
              </div>
              {currentPlan !== PLAN_TYPES.PRO && (
                <button
                  onClick={() => document.getElementById('subscription-plans').scrollIntoView({ behavior: 'smooth' })}
                  className="btn-primary px-4 py-2"
                >
                  Upgrade Plan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
          {profileMessage && (
            <p className={`mb-4 text-sm ${profileMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              {profileMessage}
            </p>
          )}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                placeholder="Your name"
                disabled={profileLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={currentUser.email || ''}
                className="w-full bg-muted"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed via settings.
              </p>
            </div>
            <button
              type="submit"
              disabled={profileLoading || name === currentUser.displayName}
              className="btn-primary px-4 py-2 disabled:opacity-50"
            >
              {profileLoading ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Preferences */}
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-6">Preferences</h2>
          
          {/* Theme Selection */}
          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-medium text-muted-foreground">Theme</h3>
            <div className="space-y-2">
              {['light', 'dark', 'system'].map((themeOption) => (
                <label
                  key={themeOption}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="theme"
                    value={themeOption}
                    checked={theme === themeOption}
                    onChange={() => setTheme(themeOption)}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm capitalize">{themeOption}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Temperature Control */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              AI Response Temperature
            </h3>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={temperature}
              onChange={handleTemperatureChange}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Value: {temperature.toFixed(1)}</span>
              <span>
                {temperature <= 0.5 ? 'More predictable' : temperature >= 0.8 ? 'More creative' : 'Balanced'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Lower values make the AI output more focused and deterministic. Higher values make it more creative and random.
            </p>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Subscription</h2>
          <p className="text-muted-foreground mb-4">
            Your current plan: <span className="font-medium text-foreground">Free Tier</span>
          </p>
          <button
            onClick={handleManageSubscription}
            className="btn-secondary px-4 py-2"
          >
            Manage Subscription
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            You will be redirected to our payment provider to manage your subscription details.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="bg-card text-card-foreground rounded-lg border border-destructive/50 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-destructive mb-4">Danger Zone</h2>
          {deleteMessage && (
            <p className={`mb-4 text-sm ${deleteMessage.includes('success') || deleteMessage.includes('placeholder') ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              {deleteMessage}
            </p>
          )}
          <p className="text-muted-foreground mb-4">
            Deleting your account is permanent and cannot be undone. All your data associated with this account will be removed.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="btn-destructive px-4 py-2 disabled:opacity-50"
          >
            {deleteLoading ? 'Deleting...' : 'Delete My Account'}
          </button>
        </div>

        {/* Subscription Plans */}
        <div id="subscription-plans" className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground">Subscription Plans</h2>
          <SubscriptionPlans />
        </div>
      </div>
    </div>
  );
}

export default Settings;
