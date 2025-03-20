import React from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation, Autoplay } from 'swiper/modules';
import '../styles/custom.css';

const themeColor = "#4B8795"; // Extracted from the Thesys logo

const features = [
  { title: 'Dashboard', route: '/dashboard', emoji: '📊' },
  { title: 'Upload Documents', route: '/upload', emoji: '📤' },
  { title: 'AI Search', route: '/search', emoji: '🔍' },
  { title: 'Chat Assistant', route: '/chat', emoji: '💬' },
  { title: 'Citations', route: '/citations', emoji: '📚' },
  { title: 'Library', route: '/library', emoji: '📖' },
  { title: 'Settings', route: '/settings', emoji: '⚙️' },
];

const pricingPlans = [
  { name: 'Free', price: '$0', features: ['Basic Summarization', 'Limited Fact-Checking', 'Basic Citations'] },
  { name: 'Student', price: '$4.99/mo', features: ['Unlimited Summarization', 'Advanced Fact-Checking', 'Full Citation Formatting'] },
  { name: 'Pro', price: '$9.99/mo', features: ['Batch Processing', 'AI Research Assistant', 'Priority Support'] },
];

const Home = () => (
  <div className="bg-white min-h-screen text-gray-900">
    {/* Hero Section */}
    <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-6" style={{ background: `linear-gradient(to bottom, white, ${themeColor})` }}>
      <h1 className="text-6xl font-extrabold">Think Less, <span style={{ color: themeColor }}>Learn More</span>!</h1>
      <p className="text-xl my-6">The smartest way to simplify your research.</p>
      <Link 
        to="/dashboard" 
        className="px-8 py-3 rounded-full text-lg transition duration-300 shadow-lg hover:shadow-xl"
        style={{ backgroundColor: themeColor, color: 'white' }}
      >
        Get Started 🚀
      </Link>
    </section>

    {/* Features Section */}
    <section className="py-20 text-center" style={{ backgroundColor: themeColor, color: 'white' }}>
      <h2 className="text-4xl font-bold mb-6">Why Choose Thesys AI?</h2>
      <p className="max-w-3xl mx-auto text-lg">Save time, enhance research, and streamline your academic journey with AI-powered tools.</p>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
        {features.map((feature, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-2xl transition duration-300 transform hover:scale-105 text-gray-900">
            <h4 className="text-2xl font-semibold mb-2">{feature.emoji} {feature.title}</h4>
            <p className="text-gray-600">Enhance your academic productivity effortlessly.</p>
          </div>
        ))}
      </div>
    </section>

    {/* Feature Carousel */}
    <section className="py-20" style={{ background: `linear-gradient(to bottom, ${themeColor}, white)` }}>
      <h2 className="text-4xl font-bold text-center mb-10 text-white">✨ Explore Our Features ✨</h2>
      <Swiper
        modules={[Navigation, Autoplay]}
        navigation
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        spaceBetween={20}
        slidesPerView={3}
        loop={true}
        className="max-w-6xl mx-auto"
      >
        {features.map((feature, index) => (
          <SwiperSlide key={index}>
            <Link to={feature.route}>
              <div className="flex flex-col items-center justify-center bg-white p-10 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2 cursor-pointer text-gray-900">
                <span className="text-7xl mb-4">{feature.emoji}</span>
                <h3 className="text-2xl font-semibold">{feature.title}</h3>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>

    {/* Pricing Section */}
    <section className="py-20 text-center bg-white">
      <h2 className="text-4xl font-bold mb-6" style={{ color: themeColor }}>Choose Your Plan</h2>
      <p className="max-w-3xl mx-auto text-lg text-gray-600">Flexible plans to fit every researcher's needs.</p>
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
        {pricingPlans.map((plan, index) => (
          <div key={index} className="border p-6 rounded-lg shadow-lg hover:shadow-2xl transition duration-300 transform hover:scale-105 text-gray-900">
            <h4 className="text-2xl font-semibold mb-2" style={{ color: themeColor }}>{plan.name}</h4>
            <p className="text-4xl font-bold">{plan.price}</p>
            <ul className="text-gray-600 mt-4">
              {plan.features.map((feature, i) => (
                <li key={i} className="mt-2">✔ {feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>

    {/* Call to Action */}
    <section className="py-20 text-center" style={{ backgroundColor: themeColor, color: 'white' }}>
      <h2 className="text-4xl font-bold mb-6">Ready to Simplify Your Research?</h2>
      <Link 
        to="/upload" 
        className="px-10 py-3 rounded-full text-lg transition duration-300 shadow-lg"
        style={{ backgroundColor: 'white', color: themeColor }}
      >
        Start Now ✨
      </Link>
    </section>

    {/* Footer */}
    <footer className="bg-gray-900 text-white text-center py-4">
      <p>© 2025 Thesys AI. Made with ❤️ for students.</p>
    </footer>
  </div>
);

export default Home;