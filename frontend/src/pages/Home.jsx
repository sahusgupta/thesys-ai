import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation, Autoplay } from 'swiper/modules';
import '../styles/custom.css';
import PricingPlans from '../components/PricingPlans';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

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

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <div className="bg-white min-h-screen text-gray-900">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-6" style={{ background: `linear-gradient(to bottom, white, ${themeColor})` }}>
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <motion.main 
              className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="text-center" variants={itemVariants}>
                <motion.h1 
                  className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl"
                  variants={itemVariants}
                >
                  <motion.span className="block" variants={itemVariants}>
                    Think Less,
                  </motion.span>
                  <motion.span 
                    className="block" 
                    style={{ color: themeColor }}
                    variants={itemVariants}
                  >
                    Learn More!
                  </motion.span>
                </motion.h1>
                <motion.p 
                  className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl"
                  variants={itemVariants}
                >
                  The smartest way to simplify your research.
                </motion.p>
                <motion.div 
                  className="mt-8 flex justify-center"
                  variants={itemVariants}
                >
                  {!user && (
                    <motion.div 
                      className="rounded-md shadow"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to="/signup"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white"
                        style={{ backgroundColor: themeColor }}
                      >
                        Get Started 🚀
                      </Link>
                    </motion.div>
                  )}
                  {user && (
                    <motion.div 
                      className="rounded-md shadow"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to="/dashboard"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white"
                        style={{ backgroundColor: themeColor }}
                      >
                        Go to Dashboard 🚀
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            </motion.main>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <motion.section 
        className="py-20 text-center" 
        style={{ backgroundColor: themeColor, color: 'white' }}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <motion.h2 
          className="text-4xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
        >
          Why Choose Thesys AI?
        </motion.h2>
        <motion.p 
          className="max-w-3xl mx-auto text-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          viewport={{ once: true }}
        >
          Save time, enhance research, and streamline your academic journey with AI-powered tools.
        </motion.p>
        <motion.div 
          className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              className="bg-white p-6 rounded-lg shadow-lg hover:shadow-2xl transition duration-300 transform hover:scale-105 text-gray-900"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <h4 className="text-2xl font-semibold mb-2">{feature.emoji} {feature.title}</h4>
              <p className="text-gray-600">Enhance your academic productivity effortlessly.</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Feature Carousel */}
      <motion.section 
        className="py-20" 
        style={{ background: `linear-gradient(to bottom, ${themeColor}, white)` }}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <motion.h2 
          className="text-4xl font-bold text-center mb-10 text-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
        >
          ✨ Explore Our Features ✨
        </motion.h2>
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
                <motion.div 
                  className="flex flex-col items-center justify-center bg-white p-10 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2 cursor-pointer text-gray-900"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-7xl mb-4">{feature.emoji}</span>
                  <h3 className="text-2xl font-semibold">{feature.title}</h3>
                </motion.div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </motion.section>

      {/* Pricing Plans Section */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <PricingPlans />
      </motion.div>

      {/* Call to Action */}
      <motion.section 
        className="py-20 text-center" 
        style={{ backgroundColor: themeColor, color: 'white' }}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <motion.h2 
          className="text-4xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          viewport={{ once: true }}
        >
          Ready to Level Up Your Research?
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          viewport={{ once: true }}
        >
          <Link 
            to="/upload" 
            className="px-10 py-3 rounded-full text-lg transition duration-300 shadow-lg"
            style={{ backgroundColor: 'white', color: themeColor }}
          >
            Start Now ✨
          </Link>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        className="bg-gray-900 text-white text-center py-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <p>© 2025 Thesys AI. Made with ❤️ for students.</p>
      </motion.footer>
    </div>
  );
};

export default Home;