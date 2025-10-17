
import React from 'react';
import { QUICK_PRICES } from '../constants';

interface PriceScreenProps {
  onNext: () => void;
  onBack: () => void;
  setHomePrice: (price: number) => void;
  homePrice: number;
}

const PriceScreen: React.FC<PriceScreenProps> = ({ onNext, onBack, setHomePrice, homePrice }) => {
  const formatCurrency = (value: number) => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
    setHomePrice(isNaN(numericValue) ? 0 : numericValue);
  };

  return (
    <div className="animate-fade-in text-center">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        What’s your target home price?
      </h2>
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">$</span>
        <input
          type="text"
          value={formatCurrency(homePrice)}
          onChange={handleInputChange}
          className="w-full text-center text-3xl font-bold p-4 pl-10 border-2 border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
          placeholder="Enter amount"
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {QUICK_PRICES.map((price) => (
          <button
            key={price}
            onClick={() => setHomePrice(price)}
            className="py-2 px-4 bg-gray-200 text-gray-700 font-semibold rounded-full hover:bg-blue-200 transition"
          >
            ${formatCurrency(price)}{price === 1000000 ? '+' : ''}
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <button onClick={onBack} className="text-gray-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={homePrice <= 0}
          className="bg-blue-600 text-white font-bold py-3 px-10 rounded-lg text-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PriceScreen;
