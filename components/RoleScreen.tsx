import React from 'react';
import type { HeroRole } from '../types';
import { HERO_ROLES } from '../constants';

interface RoleScreenProps {
  onNext: () => void;
  onBack: () => void;
  onSelectRole: (role: HeroRole) => void;
  selectedRole: HeroRole | null;
}

const RoleScreen: React.FC<RoleScreenProps> = ({ onNext, onBack, onSelectRole, selectedRole }) => {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-8">
        Which best describes you?
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {HERO_ROLES.map(({ name, icon }) => (
          <button
            key={name}
            onClick={() => onSelectRole(name)}
            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 flex flex-col items-center justify-center space-y-2 aspect-square ${
              selectedRole === name
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <span className="text-3xl sm:text-4xl">{icon}</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-700">{name}</span>
          </button>
        ))}
      </div>

      {/* Instructional text appears after selection to guide the user */}
      <div className="text-center h-12 flex items-center justify-center">
        {selectedRole && (
          <p className="text-gray-600 font-semibold animate-fade-in" aria-live="polite">
            Great choice! Click 'Next' to continue.
          </p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-gray-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedRole}
          className={`
            bg-blue-600 text-white font-bold py-3 px-10 rounded-lg text-lg 
            hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 
            transition-all transform hover:scale-105 
            disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none
            ${selectedRole ? 'animate-pulse' : ''}
          `}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default RoleScreen;