import React, { useState, useEffect, useRef } from 'react';
import type { FormData, SavingsData, GeneratedContent } from '../types';
import { generateNotifications } from '../services/notificationService';
import { sendLeadData } from '../services/webhookService';
import { sanitizeFormData } from '../utils/sanitize';

interface ResultsTeaserScreenProps {
  onNext: () => void;
  onBack: () => void;
  setGeneratedContent: (content: GeneratedContent | null) => void;
  savingsData: SavingsData;
  formData: FormData;
  updateFormData: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}

const loadingMessages = [
  'Analyzing your savings...',
  'Connecting with our partners...',
  'Calculating your Hero Credit...',
  'Finalizing your report...',
];

const BOT_MIN_ELAPSED_MS = 3000;

const ResultsTeaserScreen: React.FC<ResultsTeaserScreenProps> = ({ onNext, onBack, setGeneratedContent, savingsData, formData, updateFormData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
  const [honeypot, setHoneypot] = useState('');
  const formStartRef = useRef(Date.now());

  useEffect(() => {
    let messageInterval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) {
      let currentIndex = 0;
      messageInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[currentIndex]);
      }, 2500);
    }
    return () => {
      if (messageInterval) {
        clearInterval(messageInterval);
      }
    };
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const elapsed = Date.now() - formStartRef.current;
    if (honeypot.trim().length > 0) {
      console.warn('Honeypot field was filled; likely bot submission blocked.');
      setError('Submission failed. Please try again.');
      return;
    }

    if (elapsed < BOT_MIN_ELAPSED_MS) {
      console.warn(`Form submitted too quickly (${elapsed}ms); blocking as potential bot.`);
      setError('Submission failed. Please try again.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const sanitizedFormData = sanitizeFormData(formData);
      const sanitizedPhoneDigits = sanitizedFormData.phone.replace(/\D+/g, '');
      if (sanitizedFormData.name !== formData.name) {
        updateFormData('name', sanitizedFormData.name);
      }
      if (sanitizedFormData.email !== formData.email) {
        updateFormData('email', sanitizedFormData.email);
      }
      if (sanitizedFormData.phone !== formData.phone) {
        updateFormData('phone', sanitizedFormData.phone);
      }
      if (sanitizedPhoneDigits.length < 10 || !sanitizedFormData.email) {
        setError('Please confirm your contact information and try again.');
        return;
      }

      const content = await generateNotifications(sanitizedFormData, savingsData);
      if (!content) {
        setError('Could not generate your report. Please try again later.');
        return;
      }

      setGeneratedContent(content);

      try {
        await sendLeadData(sanitizedFormData, savingsData, content);
      } catch (err) {
        console.error("Lead sync failed:", err);
      }

      onNext();
    } finally {
      setIsLoading(false);
    }
  };
  
  const isFormValid = formData.name && formData.email && formData.phone && formData.tcpaConsent;

  return (
    <div className="animate-fade-in text-center relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center rounded-lg z-10 transition-opacity duration-300">
          <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-semibold text-gray-700 animate-pulse">{loadingMessage}</p>
        </div>
      )}

      <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-3">
        🎉 You Qualify for Hero Savings!
      </h2>
      <p className="text-gray-600 mb-6">Based on your info, you’ve unlocked a Hero Credit plus partner discounts.</p>
      
      <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6 text-left">
        <p className="font-bold">💰 Your estimated savings are worth thousands.</p>
      </div>

      <div className="bg-gray-100 p-6 rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700 mb-4">Enter your information below to unlock your full breakdown of your loan amount, Hero Credit, and total savings.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Name" 
            value={formData.name}
            onChange={e => updateFormData('name', e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          <input 
            type="email" 
            placeholder="Email" 
            value={formData.email}
            onChange={e => updateFormData('email', e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          <input 
            type="tel" 
            placeholder="Phone" 
            value={formData.phone}
            onChange={e => updateFormData('phone', e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          <div className="hidden" aria-hidden="true">
            <label>
              Company
              <input
                type="text"
                name="company"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          
          <div className="text-left">
            <label className="flex items-center space-x-2 text-gray-600 cursor-pointer">
              <input 
                type="checkbox"
                checked={formData.wantsText}
                onChange={e => updateFormData('wantsText', e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Text me my results</span>
            </label>
          </div>

          <div className="text-left text-xs text-gray-500">
            <label className="flex items-start space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.tcpaConsent}
                onChange={e => updateFormData('tcpaConsent', e.target.checked)}
                required
                className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
              />
              <span>By submitting, you agree that Downtown Financial Group may contact you by call, text, and email at the number and address provided, including with automated technology and prerecorded messages, about your inquiry and related services. Consent is not required to obtain services. Message and data rates may apply. You also agree to our <a href="#" className="underline hover:text-blue-600" target="_blank">Privacy Policy</a> and <a href="#" className="underline hover:text-blue-600" target="_blank">Terms</a>.</span>
            </label>
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <div className="flex flex-row-reverse justify-between items-center pt-4">
            <button 
              type="submit" 
              disabled={!isFormValid || isLoading}
              className="bg-blue-600 text-white font-bold py-3 px-10 rounded-lg text-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              Unlock My Full Report
            </button>
             <button type="button" onClick={onBack} className="text-gray-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition">
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResultsTeaserScreen;
