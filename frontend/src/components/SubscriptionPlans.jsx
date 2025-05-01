import React from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { FiCheck, FiX } from 'react-icons/fi';

export default function SubscriptionPlans() {
  const { currentPlan, PLAN_TYPES, PLAN_LIMITS } = useSubscription();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      type: PLAN_TYPES.FREE,
      description: 'Get started with basic features',
      features: [
        { name: 'Basic chat access', included: true },
        { name: 'Up to 5 messages per day', included: true },
        { name: 'Basic search functionality', included: true },
        { name: 'Document upload', included: false },
        { name: 'Citation export', included: false },
        { name: 'Batch processing', included: false },
      ],
    },
    {
      name: 'Student',
      price: '$4.99',
      type: PLAN_TYPES.STUDENT,
      description: 'Perfect for students and researchers',
      features: [
        { name: 'Basic chat access', included: true },
        { name: 'Up to 50 messages per day', included: true },
        { name: 'Advanced search functionality', included: true },
        { name: 'Document upload', included: true },
        { name: 'Citation export', included: true },
        { name: 'Batch processing', included: false },
      ],
    },
    {
      name: 'Pro',
      price: '$9.99',
      type: PLAN_TYPES.PRO,
      description: 'For power users and organizations',
      features: [
        { name: 'Basic chat access', included: true },
        { name: 'Unlimited messages', included: true },
        { name: 'Advanced search functionality', included: true },
        { name: 'Document upload', included: true },
        { name: 'Citation export', included: true },
        { name: 'Batch processing', included: true },
      ],
    },
  ];

  const handleUpgrade = (planType) => {
    // Here you would integrate with your payment provider (e.g., Stripe)
    console.log('Upgrading to plan:', planType);
    alert('This would normally open your payment provider. Integration pending.');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <div
          key={plan.type}
          className={`bg-card rounded-lg border ${
            currentPlan === plan.type
              ? 'border-primary ring-2 ring-primary ring-offset-2'
              : 'border-border'
          } shadow-sm p-6`}
        >
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-foreground">{plan.name}</h3>
            <div className="mt-4">
              <span className="text-4xl font-bold text-foreground">{plan.price}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="mt-4 text-muted-foreground">{plan.description}</p>
          </div>

          <ul className="mt-6 space-y-4">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                {feature.included ? (
                  <FiCheck className="text-green-500 mr-2" />
                ) : (
                  <FiX className="text-destructive mr-2" />
                )}
                <span className={feature.included ? 'text-foreground' : 'text-muted-foreground'}>
                  {feature.name}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {currentPlan === plan.type ? (
              <button
                className="w-full btn-secondary"
                disabled
              >
                Current Plan
              </button>
            ) : (
              <button
                onClick={() => handleUpgrade(plan.type)}
                className="w-full btn-primary"
              >
                Upgrade to {plan.name}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 