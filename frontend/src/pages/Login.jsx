import React, { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    handleLogin();
  };

  const handleLogin = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Login success - redirect would happen here in a real app
      console.log('Login successful with:', { email, password });
    }, 1500);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!validateEmail(resetEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    // Simulate API call for password reset
    setTimeout(() => {
      setLoading(false);
      setForgotPassword(false);
      setResetEmail('');
      alert('Password reset link sent to your email');
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-md rounded-lg px-8 py-6 mb-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">
              {forgotPassword ? 'Reset Password' : 'Welcome Back'}
            </h2>
            <p className="text-gray-600 mt-2">
              {forgotPassword 
                ? 'Enter your email to receive a reset link' 
                : 'Sign in to continue to your AI research assistant'}
            </p>
          </div>

          {!forgotPassword ? (
            <div className="relative">
              <form onSubmit={currentStep === 1 ? handleEmailSubmit : handlePasswordSubmit}>
                
                {/* Email Step */}
                <div 
                  className={`transition-all duration-500 ${
                    currentStep === 1 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 -translate-y-10 absolute'
                  }`}
                >
                  <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mt-4 transition-colors"
                  >
                    Continue
                  </button>
                </div>

                {/* Password Step */}
                <div 
                  className={`transition-all duration-500 ${
                    currentStep === 2 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-10 absolute'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-700 text-sm font-semibold" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={() => setCurrentStep(1)}
                    >
                      Change email
                    </button>
                  </div>
                  
                  <input
                    id="password"
                    type="password"
                    className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus={currentStep === 2}
                  />
                  
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                        Remember me
                      </label>
                    </div>
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={() => setForgotPassword(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mt-4 transition-colors flex justify-center items-center"
                  >
                    {loading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Sign In'}
                  </button>
                </div>
              </form>

              {/* Error Message */}
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mt-4" role="alert">
                  <p>{error}</p>
                </div>
              )}
            </div>
          ) : (
            /* Forgot Password Form */
            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="reset-email">
                  Email Address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => setForgotPassword(false)}
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 hover:text-blue-800 font-semibold">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;