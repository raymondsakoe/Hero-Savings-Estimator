
import React from 'react';
import { TOTAL_STEPS } from '../constants';

interface ProgressBarProps {
  currentStep: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
  const progressPercentage = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${progressPercentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
