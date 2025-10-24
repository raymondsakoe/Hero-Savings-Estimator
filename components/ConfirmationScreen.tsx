import React, { useState, useEffect } from 'react';
import type { GeneratedContent, FormData, SavingsData } from '../types';
import { GUARANTEED_SAVINGS, MIN_BONUS_SAVINGS, MAX_BONUS_SAVINGS, TESTIMONIALS } from '../constants';
import { sanitizeFormData } from '../utils/sanitize';

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
    </svg>
);

// --- Testimonial Carousel Component ---
interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
}

const TestimonialCarousel: React.FC<TestimonialCarouselProps> = ({ testimonials }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (testimonials.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 7000); // Change testimonial every 7 seconds

    return () => clearInterval(timer);
  }, [testimonials.length]);

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div className="my-10 p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
      <h3 className="text-xl font-bold text-gray-800 mb-4">What Our Heroes Are Saying</h3>
      <div className="relative h-48 flex items-center justify-center overflow-hidden">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className={`absolute w-full transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <blockquote className="text-gray-600 italic text-lg leading-relaxed max-w-xl mx-auto">
              “{testimonial.quote}”
            </blockquote>
            <cite className="mt-4 block font-semibold text-gray-700 not-italic">
              {testimonial.name}
              <span className="block text-sm font-normal text-gray-500">{testimonial.role}</span>
            </cite>
          </div>
        ))}
      </div>
    </div>
  );
};

// FIX: Define ConfirmationScreenProps interface
interface ConfirmationScreenProps {
  generatedContent: GeneratedContent | null;
  formData: FormData;
  savingsData: SavingsData | null;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ generatedContent, formData, savingsData }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const handleShare = async () => {
    if (!savingsData) return;

    const shareText = `I just found out I could save between ${formatCurrency(savingsData.minSavings)} and ${formatCurrency(savingsData.maxSavings)} on a new home with Keys for Community Heroes! Find out your savings.`;
    const shareUrl = window.location.href; 

    const shareData = {
      title: 'My Hero Savings Report',
      text: shareText,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2500);
      } catch (err) {
        console.error('Failed to copy: ', err);
        alert('Could not copy link to clipboard.');
      }
    }
  };

  const sanitizedFormData = sanitizeFormData(formData);
  const greetingName = sanitizedFormData.name.split(' ')[0] || 'Hero';

  return (
    <div className="animate-fade-in text-center">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-3">
        ✅ Your Full Hero Savings Report is on the way!
      </h2>
      <p className="text-gray-600 mb-6">
        We’ve sent your personalized savings breakdown to your email and phone. Our Keys for Community Heroes team will connect with you within 24 hours to confirm your options.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
        <a
          href="https://calendly.com/malcolm-downtownfinancialgroup/quickintakecall"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 text-white font-bold py-3 px-10 rounded-lg text-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-transform transform hover:scale-105 w-full sm:w-auto"
        >
          Book My Free Call
        </a>
         <button
            onClick={handleShare}
            disabled={!savingsData}
            className="inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-700 font-bold py-3 px-8 rounded-lg text-lg hover:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all disabled:bg-gray-100 disabled:text-gray-400 w-full sm:w-auto"
        >
            <ShareIcon />
            {copyStatus === 'copied' ? 'Link Copied!' : 'Share My Savings'}
        </button>
      </div>
      
      <TestimonialCarousel testimonials={TESTIMONIALS} />

      {generatedContent && savingsData && (
        <div className="text-left space-y-6 bg-gray-50 p-6 rounded-lg border">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Email Preview:</h3>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm text-gray-500 mb-3 border-b pb-3">
                    <span className="font-semibold">From:</span><span>Keys for Community Heroes</span>
                    <span className="font-semibold">To:</span><span>{sanitizedFormData.email}</span>
                    <span className="font-semibold">Subject:</span><span className="font-bold text-gray-800">{generatedContent.email.subject}</span>
                </div>
                <div className="text-gray-700 text-sm leading-relaxed space-y-4 p-2">
                    <p>Hi {greetingName},</p>
                    <p>Here’s your personalized Hero Savings Report.</p>

                    <table className="w-full text-left">
                        <tbody>
                        <tr className="border-b">
                            <td className="py-2 text-gray-600">Home Price:</td>
                            <td className="py-2 font-semibold text-right">{formatCurrency(formData.homePrice)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-2 text-gray-600">Down Payment:</td>
                            <td className="py-2 font-semibold text-right">{formData.downPaymentPercent}% ({formatCurrency((formData.homePrice * formData.downPaymentPercent) / 100)})</td>
                        </tr>
                        <tr>
                            <td className="py-2 text-gray-600">Estimated Loan Amount:</td>
                            <td className="py-2 font-semibold text-right">{formatCurrency(savingsData.loanAmount)}</td>
                        </tr>
                        </tbody>
                    </table>

                    <div className="pt-2">
                        <h4 className="font-bold text-gray-800 mb-2">Your Savings Breakdown</h4>
                        <table className="w-full text-left">
                        <tbody>
                            <tr className="border-b">
                            <td className="py-2 text-gray-600">• Hero Credit</td>
                            <td className="py-2 font-semibold text-right">{formatCurrency(savingsData.heroCredit)}</td>
                            </tr>
                            <tr className="border-b">
                            <td className="py-2 text-gray-600">• Guaranteed Partner Savings</td>
                            <td className="py-2 font-semibold text-right">{formatCurrency(GUARANTEED_SAVINGS)}</td>
                            </tr>
                            <tr>
                            <td className="py-2 text-gray-600">• Potential Bonus Savings</td>
                            <td className="py-2 font-semibold text-right">{formatCurrency(MIN_BONUS_SAVINGS)} – {formatCurrency(MAX_BONUS_SAVINGS)}</td>
                            </tr>
                        </tbody>
                        </table>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg mt-4">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-800">Total Estimated Savings:</span>
                            <span className="font-bold text-lg text-green-600">{formatCurrency(savingsData.minSavings)} – {formatCurrency(savingsData.maxSavings)}</span>
                        </div>
                    </div>

                    <p className="pt-2">
                        Book your free call to confirm numbers and next steps:<br/>
                        <a href="https://calendly.com/malcolm-downtownfinancialgroup/quickintakecall" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                        https://calendly.com/malcolm-downtownfinancialgroup/quickintakecall
                        </a>
                    </p>
                </div>
            </div>
          </div>
          {formData.wantsText && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">SMS Preview:</h3>
                <div className="bg-gray-200 p-4 rounded-lg flex justify-end">
                    <div className="bg-blue-500 text-white p-3 rounded-2xl rounded-br-lg max-w-sm shadow">
                        <p className="text-sm whitespace-pre-wrap">{generatedContent.sms.body}</p>
                    </div>
                </div>
            </div>
          )}
        </div>
      )}
      <div className="mt-8 text-left text-xs text-gray-500 border-t pt-4">
        <p><strong>For information purposes only.</strong> This is not a commitment to lend or extend credit. Information and/or dates are subject to change without notice. All loans are subject to credit approval. Program availability, terms, and savings vary by state and are subject to change without notice. Estimated savings include a lender closing credit determined by loan amount tier and may include partner discounts; partner discounts are provided by third parties and are not guaranteed. Insurance premium comparisons reflect quoted differences versus alternative carriers and will vary by property, coverage, and carrier underwriting. Moving and inspection discounts are subject to vendor participation and availability. This tool provides estimates only and does not constitute financial, legal, or tax advice. Downtown Financial Group | NMLS #1830011 & #2072896. Powered by Go Rascal.</p>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
