import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { currentUser, logout, updateUserProfile, updateUserEmail, updateUserPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const promises = [];
      
      // Update profile if display name changed
      if (e.target.displayName.value !== currentUser.displayName) {
        promises.push(updateUserProfile({ displayName: e.target.displayName.value }));
      }

      // Update email if changed
      if (e.target.email.value !== currentUser.email) {
        promises.push(updateUserEmail(e.target.email.value));
      }

      // Update password if provided
      if (e.target.password.value) {
        if (e.target.password.value !== e.target.confirmPassword.value) {
          throw new Error('Passwords do not match');
        }
        promises.push(updateUserPassword(e.target.password.value));
      }

      await Promise.all(promises);
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
          
          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50 text-red-800">
              {error}
            </div>
          )}
          
          {message && (
            <div className="mb-4 p-4 rounded-md bg-green-50 text-green-800">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                defaultValue={currentUser?.displayName || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4B8795] focus:ring-[#4B8795] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                name="email"
                defaultValue={currentUser?.email || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4B8795] focus:ring-[#4B8795] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Leave blank to keep the same"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4B8795] focus:ring-[#4B8795] sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Leave blank to keep the same"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4B8795] focus:ring-[#4B8795] sm:text-sm"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={logout}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4B8795]"
              >
                Logout
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#4B8795] hover:bg-[#407986] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4B8795]"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 