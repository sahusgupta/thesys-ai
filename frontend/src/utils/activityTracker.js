// Simple activity tracker that just works
export const ACTIVITY_TYPES = {
  CHAT_STARTED: 'chat_started',
  ARTICLE_LIKED: 'article_liked',
  FILE_DOWNLOADED: 'file_downloaded'
};

// Simple in-memory store
let activities = [];

// Add activity - simple and direct
export const addActivity = (type, details) => {
  // Log the activity immediately
  console.log('=== ACTIVITY TRIGGERED ===');
  console.log('Type:', type);
  console.log('Details:', details);
  
  const activity = {
    type,
    details,
    timestamp: new Date().toISOString()
  };
  
  // Add to front of array
  activities.unshift(activity);
  
  // Keep only last 10
  if (activities.length > 10) {
    activities = activities.slice(0, 10);
  }
  
  // Save to sessionStorage
  try {
    sessionStorage.setItem('activities', JSON.stringify(activities));
    console.log('=== ACTIVITY SAVED ===');
    console.log('Current activities:', activities);
  } catch (e) {
    console.error('Failed to save activity:', e);
  }
};

// Get activities - simple and direct
export const getRecentActivities = () => {
  // Try to load from sessionStorage
  try {
    const stored = sessionStorage.getItem('activities');
    if (stored) {
      activities = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load activities:', e);
  }
  
  return activities;
};

// Clear all activities
export const clearActivities = () => {
  console.log('Clearing all activities');
  activities = [];
  try {
    sessionStorage.removeItem('activities');
  } catch (err) {
    console.error('Failed to clear activities from sessionStorage:', err);
  }
}; 