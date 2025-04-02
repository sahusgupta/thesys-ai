import React, { useState } from 'react';
import { User, Lock, Mail, BookOpen, Zap, BrainCircuit, Check, Eye, EyeOff, ArrowRight } from 'lucide-react';

const Signup = () => {
  // State for form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [interests, setInterests] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [animationDirection, setAnimationDirection] = useState('next');

  // Available research interests
  const availableInterests = [
    'Machine Learning', 'Natural Language Processing', 
    'Computer Vision', 'Reinforcement Learning', 
    'AI Ethics', 'Neural Networks', 'Robotics', 
    'Data Science', 'Cognitive Science'
  ];

  // Role options
  const roles = [
    { id: 'student', label: 'Student', icon: <BookOpen size={20} /> },
    { id: 'researcher', label: 'Researcher', icon: <BrainCircuit size={20} /> },
    { id: 'professional', label: 'Professional', icon: <Zap size={20} /> }
  ];

  // Handle step transitions
  const nextStep = () => {
    if (validateCurrentStep()) {
      setAnimationDirection('next');
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  const prevStep = () => {
    setAnimationDirection('prev');
    setTimeout(() => setCurrentStep(currentStep - 1), 300);
  };

  // Validation for current step
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0: // Email
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      case 1: // Password
        return password.length >= 8;
      case 2: // Confirm password
        return password === confirmPassword;
      case 3: // Name
        return name.trim().length > 0;
      case 4: // Role
        return role !== '';
      case 5: // Interests
        return interests.length > 0;
      default:
        return true;
    }
  };

  // Toggle interest selection
  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      email,
      password,
      name,
      role,
      interests
    });
    // Here you would normally submit to your backend
    setCurrentStep(6); // Move to success screen
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {currentStep === 6 ? "Welcome aboard!" : "Create your account"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {currentStep === 6 ? 
              "Your AI research assistant is ready to help you learn and discover." : 
              "Join our AI research platform"
            }
          </p>
        </div>
        
        <div className="mt-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="relative h-48">
              {/* Email Field Container */}
              <div 
                className={`absolute w-full transition-all duration-300 transform ${
                  currentStep === 0 
                    ? 'translate-x-0 opacity-100' 
                    : animationDirection === 'next' 
                      ? '-translate-x-full opacity-0' 
                      : 'translate-x-full opacity-0'
                }`}
              >
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 pr-3 py-3 focus:ring-[#407986] focus:border-[#407986] block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Password Field Container */}
              <div 
                className={`absolute w-full transition-all duration-300 transform ${
                  currentStep === 1 
                    ? 'translate-x-0 opacity-100' 
                    : currentStep < 1 
                      ? 'translate-x-full opacity-0' 
                      : '-translate-x-full opacity-0'
                }`}
              >
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 py-3 focus:ring-[#407986] focus:border-[#407986] block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="At least 8 characters"
                    />
                    <button 
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
                </div>
              </div>

              {/* Confirm Password Field Container */}
              <div 
                className={`absolute w-full transition-all duration-300 transform ${
                  currentStep === 2 
                    ? 'translate-x-0 opacity-100' 
                    : currentStep < 2 
                      ? 'translate-x-full opacity-0' 
                      : '-translate-x-full opacity-0'
                }`}
              >
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 pr-10 py-3 focus:ring-[#407986] focus:border-[#407986] block w-full sm:text-sm border-gray-300 rounded-md ${
                        confirmPassword && password !== confirmPassword ? 'border-red-500' : ''
                      }`}
                      placeholder="Confirm your password"
                    />
                    <button 
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Name Field Container */}
              <div 
                className={`absolute w-full transition-all duration-300 transform ${
                  currentStep === 3 
                    ? 'translate-x-0 opacity-100' 
                    : currentStep < 3 
                      ? 'translate-x-full opacity-0' 
                      : '-translate-x-full opacity-0'
                }`}
              >
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 pr-3 py-3 focus:ring-[#407986] focus:border-[#407986] block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Your full name"
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection Container */}
              <div 
                className={`absolute w-full transition-all duration-300 transform ${
                  currentStep === 4 
                    ? 'translate-x-0 opacity-100' 
                    : currentStep < 4 
                      ? 'translate-x-full opacity-0' 
                      : '-translate-x-full opacity-0'
                }`}
              >
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">What best describes you?</label>
                  <div className="grid grid-cols-3 gap-3">
                    {roles.map((roleOption) => (
                      <div 
                        key={roleOption.id}
                        onClick={() => setRole(roleOption.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border ${
                          role === roleOption.id 
                            ? 'bg-[#407986]/10 border-[#407986] text-[#407986]' 
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {roleOption.icon}
                        <span className="mt-2 text-sm">{roleOption.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Research Interests Container */}
              <div 
                className={`absolute w-full transition-all duration-300 transform ${
                  currentStep === 5 
                    ? 'translate-x-0 opacity-100' 
                    : currentStep < 5 
                      ? 'translate-x-full opacity-0' 
                      : '-translate-x-full opacity-0'
                }`}
              >
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select your research interests</label>
                  <div className="flex flex-wrap gap-2">
                    {availableInterests.map((interest) => (
                      <div 
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                          interests.includes(interest) 
                            ? 'bg-[#407986]/10 text-[#407986] border border-[#407986]' 
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {interest}
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Select at least one interest</p>
                </div>
              </div>

              {/* Success Screen Container */}
              <div 
                className={`absolute w-full transition-all duration-300 transform ${
                  currentStep === 6 
                    ? 'translate-x-0 opacity-100' 
                    : currentStep < 6 
                      ? 'translate-x-full opacity-0' 
                      : '-translate-x-full opacity-0'
                }`}
              >
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#407986]/10">
                      <Check className="h-6 w-6 text-[#407986]" />
                    </div>
                    <h3 className="mt-3 text-lg font-medium text-gray-900">Account created successfully!</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        We've personalized your AI research assistant based on your preferences.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              {currentStep > 0 && currentStep < 6 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back
                </button>
              )}
              
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateCurrentStep()}
                  className={`${
                    currentStep === 0 ? 'w-full' : 'ml-auto'
                  } inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#407986] hover:bg-[#407986]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#407986] ${
                    !validateCurrentStep() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Next
                  <ArrowRight className="ml-2 -mr-1 h-4 w-4" />
                </button>
              ) : currentStep === 5 ? (
                <button
                  type="submit"
                  disabled={!validateCurrentStep()}
                  className="ml-auto inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#407986] hover:bg-[#407986]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#407986]"
                >
                  Create Account
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#407986] hover:bg-[#407986]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#407986]"
                  onClick={() => window.location.href = "/dashboard"}
                >
                  Go to Dashboard
                </button>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="pt-4">
              <div className="flex justify-between">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div 
                    key={index}
                    className={`h-1 w-1/6 rounded-full ${
                      index <= currentStep ? 'bg-[#407986]' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Login Link */}
        {currentStep < 6 && (
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-[#407986] hover:text-[#407986]/80">
                Sign in
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;