import React from 'react';

interface WelcomeScreenProps {
  onNext: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext }) => {
  return (
    <div className="text-center animate-fade-in">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 mb-4">
        Unlock Thousands in Homebuyer Savings
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
        Exclusive rewards for First Responders, Blue-Collar Workers, and Everyday Heroes.
      </p>
      <button
        onClick={onNext}
        className="bg-orange-600 text-white font-bold py-3 px-10 rounded-lg text-lg hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-300 transition-transform transform hover:scale-105"
      >
        👉 See My Savings Now
      </button>
      <div className="mt-6 text-gray-500 text-sm">
        <span>🔒 Secure</span>
        <span className="mx-3 text-gray-300">|</span>
        <span>✅ No Credit Pull</span>
        <span className="mx-3 text-gray-300">|</span>
        <span>🕑 60 Seconds</span>
      </div>
    </div>
  );
};

export default WelcomeScreen;
