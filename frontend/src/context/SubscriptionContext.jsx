import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const PLAN_TYPES = {
  FREE: 'free',
  STUDENT: 'student',
  PRO: 'pro'
};

export const PLAN_LIMITS = {
  [PLAN_TYPES.FREE]: {
    messagesPerDay: 5,
    features: ['basic-chat', 'basic-search']
  },
  [PLAN_TYPES.STUDENT]: {
    messagesPerDay: 50,
    features: ['basic-chat', 'basic-search', 'document-upload', 'citation-export']
  },
  [PLAN_TYPES.PRO]: {
    messagesPerDay: Infinity,
    features: ['basic-chat', 'basic-search', 'document-upload', 'citation-export', 'batch-processing', 'api-access']
  }
};

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
  const { currentUser } = useAuth();
  const [currentPlan, setCurrentPlan] = useState(PLAN_TYPES.FREE);
  const [messageCount, setMessageCount] = useState(0);
  const [lastReset, setLastReset] = useState(new Date().toISOString().split('T')[0]);

  // Reset message count daily
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (today !== lastReset) {
      setMessageCount(0);
      setLastReset(today);
    }
  }, [lastReset]);

  // Load user's subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (!currentUser) {
        setCurrentPlan(PLAN_TYPES.FREE);
        return;
      }

      try {
        // Here you would typically fetch the user's subscription from your backend
        // For now, we'll use localStorage as a mock
        const storedPlan = localStorage.getItem(`subscription_${currentUser.uid}`);
        if (storedPlan) {
          setCurrentPlan(storedPlan);
        }

        const storedCount = localStorage.getItem(`messageCount_${currentUser.uid}_${lastReset}`);
        if (storedCount) {
          setMessageCount(parseInt(storedCount, 10));
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      }
    };

    loadSubscription();
  }, [currentUser, lastReset]);

  // Save message count when it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`messageCount_${currentUser.uid}_${lastReset}`, messageCount.toString());
    }
  }, [currentUser, messageCount, lastReset]);

  const canSendMessage = () => {
    const limit = PLAN_LIMITS[currentPlan].messagesPerDay;
    return messageCount < limit;
  };

  const incrementMessageCount = () => {
    setMessageCount(prev => prev + 1);
  };

  const hasFeature = (featureKey) => {
    return PLAN_LIMITS[currentPlan].features.includes(featureKey);
  };

  const getRemainingMessages = () => {
    const limit = PLAN_LIMITS[currentPlan].messagesPerDay;
    return Math.max(0, limit - messageCount);
  };

  const value = {
    currentPlan,
    messageCount,
    canSendMessage,
    incrementMessageCount,
    hasFeature,
    getRemainingMessages,
    PLAN_TYPES,
    PLAN_LIMITS
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
} 