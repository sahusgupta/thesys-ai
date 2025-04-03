import React from 'react';
import { Check } from 'lucide-react';

// 1) Import Stripe’s client-side utility
import { loadStripe } from '@stripe/stripe-js';

// 2) Initialize your publishable Stripe key here
//    Replace "pk_test_..." with your real publishable key
const stripePromise = loadStripe('pk_test_51R9g0OLiznA2e2jGYTgeX8Fd5BdvP4hNG9S2C5GBZomEJMoSbHpvpgY5tGPSewYoBDaxdr0PJ5SzseQEqce8gsbs003mCGuX55');

const PricingPlans = () => {
  const plans = [
    {
      name: 'Basic',
      price: '$4.99',
      period: 'month',
      features: [
        'Up to 100 research papers per month',
        'Basic AI analysis',
        'Standard support',
        'PDF export'
      ],
      priceId: 'price_1R9gDjLiznA2e2jGkabcjJGS', // Your actual Stripe price ID
      popular: false
    },
    {
      name: 'Pro',
      price: '$14.99',
      period: 'month',
      features: [
        'Unlimited research papers',
        'Advanced AI analysis',
        'Priority support',
        'PDF & Word export',
        'Citation management',
        'Team collaboration'
      ],
      priceId: 'price_1R9gDtLiznA2e2jGF7pZCd3E', // Your actual Stripe price ID
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$30.99',
      period: 'user/month',
      features: [
        'Everything in Pro',
        'Custom AI training',
        'Dedicated support',
        'API access',
        'Advanced analytics',
        'Custom integrations'
      ],
      priceId: 'price_1R9gE7LiznA2e2jGp70eTKSa', // Your actual Stripe price ID
      popular: false
    }
  ];

  // 3) Define your successUrl and cancelUrl
  //    These are the pages Stripe will redirect to after checkout
  const SUCCESS_URL = 'http://localhost:5173/';
  const CANCEL_URL = 'http://localhost:5173/';

  const handleSubscribe = async (priceId) => {
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        alert('Stripe failed to load. Please refresh and try again.');
        return;
      }

      // 4) Perform the redirect with inline lineItems
      //    mode: 'subscription' for recurring billing
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL
      });

      if (error) {
        console.error('Error redirecting to checkout:', error);
        alert('Failed to open payment dialog. Please try again.');
      }
    } catch (err) {
      console.error('Error opening Stripe checkout:', err);
      alert('Failed to open payment dialog. Please try again.');
    }
  };

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose your plan
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Select the perfect plan for your research needs
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 ${
                plan.popular ? 'border-[#407986] ring-2 ring-[#407986]' : ''
              }`}
            >
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {plan.name}
                </h2>
                <p className="mt-4 text-sm text-gray-500">
                  {plan.description}
                </p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-base font-medium text-gray-500">
                    /{plan.period}
                  </span>
                </p>
                <button
                  onClick={() => handleSubscribe(plan.priceId)}
                  className={`mt-8 block w-full py-3 px-4 border border-transparent rounded-md shadow text-center text-sm font-medium text-white ${
                    plan.popular
                      ? 'bg-[#407986] hover:bg-[#2c5a66]'
                      : 'bg-gray-800 hover:bg-gray-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#407986] transition-colors duration-200`}
                >
                  Subscribe
                </button>
                {plan.popular && (
                  <p className="mt-4 text-sm text-[#407986] font-semibold text-center">
                    Most popular
                  </p>
                )}
              </div>
              <div className="pt-6 pb-8 px-6">
                <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                  What's included
                </h3>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
