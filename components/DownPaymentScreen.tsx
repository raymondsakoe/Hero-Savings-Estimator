
import React, { useState, useEffect } from 'react';
import { DOWN_PAYMENT_OPTIONS } from '../constants';

interface DownPaymentScreenProps {
  onNext: () => void;
  onBack: () => void;
  setDownPayment: (percent: number) => void;
  downPaymentPercent: number;
  homePrice: number;
}

const DownPaymentScreen: React.FC<DownPaymentScreenProps> = ({ onNext, onBack, setDownPayment, downPaymentPercent, homePrice }) => {
  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };
  
  const [selectedOption, setSelectedOption] = useState<number | 'other'>(
    DOWN_PAYMENT_OPTIONS.includes(downPaymentPercent) ? downPaymentPercent : 'other'
  );
  const [customPercent, setCustomPercent] = useState(
      DOWN_PAYMENT_OPTIONS.includes(downPaymentPercent) ? '' : downPaymentPercent.toString()
  );

  const handleSelection = (option: number | 'other') => {
    setSelectedOption(option);
    if (typeof option === 'number') {
      setDownPayment(option);
      setCustomPercent('');
    }
  };

  useEffect(() => {
    if (selectedOption === 'other') {
      const numericValue = parseFloat(customPercent);
      if (!isNaN(numericValue) && numericValue >= 0) {
        setDownPayment(numericValue);
      } else {
        setDownPayment(0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPercent, selectedOption]);

  const isValid = downPaymentPercent > 0;

  return (
    <div className="animate-fade-in text-center">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
        How much do you plan to put down?
      </h2>
      <p className="text-gray-500 mb-8">We’ll use this to estimate your loan amount and Hero Credit reward.</p>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {DOWN_PAYMENT_OPTIONS.map(percent => {
          const amount = (homePrice * percent) / 100;
          return (
            <button
              key={percent}
              onClick={() => handleSelection(percent)}
              className={`p-4 border-2 rounded-lg font-bold transition flex flex-col items-center justify-center space-y-1 ${selectedOption === percent ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
            >
              <span className="text-lg">{percent}%</span>
              <span className="text-sm font-normal text-gray-500">{formatCurrency(amount)}</span>
            </button>
          );
        })}
        <div 
          onClick={() => {
            const input = document.getElementById('custom-down-payment');
            if (input) input.focus();
          }}
          className={`col-span-2 md:col-span-1 p-4 border-2 rounded-lg font-bold transition flex flex-col items-center justify-center space-y-1 cursor-text ${selectedOption === 'other' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
          <div className="relative w-full text-center">
             <input
              id="custom-down-payment"
              type="number"
              value={customPercent}
              onChange={(e) => setCustomPercent(e.target.value)}
              onFocus={() => setSelectedOption('other')}
              placeholder="Other %"
              className="w-full text-center bg-transparent outline-none font-bold text-lg placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="0"
            />
          </div>
          {selectedOption === 'other' && parseFloat(customPercent) > 0 && (
             <span className="text-sm font-normal text-gray-500">{formatCurrency((homePrice * parseFloat(customPercent)) / 100)}</span>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-10">
        <button onClick={onBack} className="text-gray-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="bg-green-600 text-white font-bold py-3 px-10 rounded-lg text-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-transform transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none"
        >
          Calculate My Savings
        </button>
      </div>
    </div>
  );
};

export default DownPaymentScreen;