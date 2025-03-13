import React from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation, Autoplay } from 'swiper/modules';

const features = [
  { title: 'Dashboard', route: '/dashboard', emoji: '📊' },
  { title: 'Upload Documents', route: '/upload', emoji: '📤' },
  { title: 'AI Search', route: '/search', emoji: '🔍' },
  { title: 'Chat Assistant', route: '/chat', emoji: '💬' },
  { title: 'Citations', route: '/citations', emoji: '📚' },
  { title: 'Library', route: '/library', emoji: '📖' },
  { title: 'Settings', route: '/settings', emoji: '⚙️' },
];

const Home = () => (
  <div className="bg-white min-h-screen">
    {/* Hero Section with Standalone CTA */}
    <section className="min-h-screen flex flex-col justify-center items-center text-center px-4">
      <h1 className="text-6xl font-bold animate-fadeInDown">👋 Welcome to Thesys AI!</h1>
      <p className="text-xl my-6 animate-fadeIn delay-500">
        The friendliest, smartest way to simplify your research.
      </p>
      <Link 
        to="/dashboard" 
        className="bg-black text-white px-10 py-3 rounded-full text-lg hover:bg-gray-800 transition duration-300 shadow-lg animate-bounce mt-4"
      >
        Get Started 🚀
      </Link>
      <p className="absolute bottom-10 text-gray-400 animate-pulse">
        Scroll down to explore
      </p>
    </section>
    {/* Additional Friendly & Informative Section */}
    <section className="py-20 px-4 text-center">
      <h2 className="text-4xl font-bold mb-4">🤔 Why Thesys AI?</h2>
      <p className="max-w-3xl mx-auto text-lg">
        We're designed specifically for students, helping you save time and effortlessly enhance your academic journey.
        With Thesys, your research becomes simpler, more organized, and more enjoyable.
      </p>

      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
        <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition duration-300 transform hover:scale-105">
          <h4 className="text-2xl font-semibold mb-2">🎯 Simple & Intuitive</h4>
          <p>Easily accessible features built specifically for your needs.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition duration-300 transform hover:scale-105">
          <h4 className="text-2xl font-semibold mb-2">⚡ Fast & Efficient</h4>
          <p>Quickly summarize, analyze, and cite your research with ease.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition duration-300 transform hover:scale-105">
          <h4 className="text-2xl font-semibold mb-2">📚 Academic Friendly</h4>
          <p>Designed specifically to support your academic success.</p>
        </div>
      </div>
    </section>

    {/* Interactive Carousel Appears on Scroll */}
    <section className="py-20 bg-gray-50">
      <h2 className="text-4xl font-bold text-center mb-10">✨ Explore Our Features ✨</h2>
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
              <div className="flex flex-col items-center justify-center rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 transform hover:-translate-y-2 cursor-pointer p-10 bg-white">
                <span className="text-7xl mb-4">{feature.emoji}</span>
                <h3 className="text-2xl font-semibold">{feature.title}</h3>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>


    {/* Friendly Call-to-Action at Bottom */}
    <section className="py-20 bg-gradient-to-r from-gray-50 to-gray-100 text-center">
      <h2 className="text-4xl font-bold mb-6">Ready to Simplify Your Research?</h2>
      <Link 
        to="/upload" 
        className="bg-black text-white px-10 py-3 rounded-full text-lg hover:bg-gray-800 transition duration-300 shadow-lg"
      >
        Start Now ✨
      </Link>
    </section>

    {/* Footer */}
    <footer className="bg-black text-white text-center py-4">
      <p>© 2025 Thesys AI. Made with ❤️ for students.</p>
    </footer>
  </div>
);

export default Home;
