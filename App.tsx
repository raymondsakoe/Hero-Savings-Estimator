import React, { useState, useMemo } from 'react';
import type { FormData, SavingsData, GeneratedContent } from './types';
import { Screen } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import RoleScreen from './components/RoleScreen';
import PriceScreen from './components/PriceScreen';
import DownPaymentScreen from './components/DownPaymentScreen';
import ResultsTeaserScreen from './components/ResultsTeaserScreen';
import ConfirmationScreen from './components/ConfirmationScreen';
import ProgressBar from './components/ProgressBar';
import Logo from './components/icons/Logo';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Welcome);
  const [formData, setFormData] = useState<FormData>({
    heroRole: null,
    homePrice: 500000,
    downPaymentPercent: 5,
    name: '',
    email: '',
    phone: '',
    wantsText: false,
    tcpaConsent: false,
  });
  const [savingsData, setSavingsData] = useState<SavingsData | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const updateFormData = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const calculateSavings = () => {
    const loanAmount = formData.homePrice - (formData.homePrice * formData.downPaymentPercent / 100);
    
    let heroCredit = 0;
    if (loanAmount < 250000) heroCredit = 500;
    else if (loanAmount < 500000) heroCredit = 1000;
    else if (loanAmount < 750000) heroCredit = 1500;
    else if (loanAmount < 1000000) heroCredit = 2000;
    else if (loanAmount < 1500000) heroCredit = 2500;
    else heroCredit = 3000;

    const guaranteedSavings = 850;
    const minBonus = 250;
    const maxBonus = 550;

    const minSavings = heroCredit + guaranteedSavings + minBonus;
    const maxSavings = heroCredit + guaranteedSavings + maxBonus;

    const newSavingsData = { loanAmount, heroCredit, minSavings, maxSavings };
    setSavingsData(newSavingsData);
    return newSavingsData;
  };

  const currentStep = useMemo(() => {
    switch (currentScreen) {
      case Screen.Role: return 1;
      case Screen.Price: return 2;
      case Screen.DownPayment: return 3;
      case Screen.Teaser: return 4;
      case Screen.Confirmation: return 5;
      default: return 0;
    }
  }, [currentScreen]);

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.Welcome:
        return <WelcomeScreen onNext={() => setCurrentScreen(Screen.Role)} />;
      case Screen.Role:
        return (
          <RoleScreen
            onBack={() => setCurrentScreen(Screen.Welcome)}
            onNext={() => setCurrentScreen(Screen.Price)}
            onSelectRole={(role) => updateFormData('heroRole', role)}
            selectedRole={formData.heroRole}
          />
        );
      case Screen.Price:
        return (
          <PriceScreen
            onNext={() => setCurrentScreen(Screen.DownPayment)}
            onBack={() => setCurrentScreen(Screen.Role)}
            setHomePrice={(price) => updateFormData('homePrice', price)}
            homePrice={formData.homePrice}
          />
        );
      case Screen.DownPayment:
        return (
          <DownPaymentScreen
            onNext={() => {
              calculateSavings();
              setCurrentScreen(Screen.Teaser);
            }}
            onBack={() => setCurrentScreen(Screen.Price)}
            setDownPayment={(percent) => updateFormData('downPaymentPercent', percent)}
            downPaymentPercent={formData.downPaymentPercent}
            homePrice={formData.homePrice}
          />
        );
      case Screen.Teaser:
        return (
          <ResultsTeaserScreen
            onBack={() => setCurrentScreen(Screen.DownPayment)}
            onNext={() => setCurrentScreen(Screen.Confirmation)}
            setGeneratedContent={setGeneratedContent}
            savingsData={savingsData!}
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case Screen.Confirmation:
        return <ConfirmationScreen generatedContent={generatedContent} formData={formData} savingsData={savingsData} />;
      default:
        return <WelcomeScreen onNext={() => setCurrentScreen(Screen.Role)} />;
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center font-sans" 
      style={{backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')"}}
    >
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="w-full max-w-2xl mx-auto">
          <div className="px-4 py-2">
            <Logo className="w-64 md:w-80 h-auto mx-auto" />
          </div>

          {currentScreen !== Screen.Welcome && currentScreen !== Screen.Confirmation && <ProgressBar currentStep={currentStep} />}
          <main className="bg-white rounded-xl shadow-2xl overflow-hidden mt-4">
            <div className="p-8 sm:p-12 min-h-[500px] flex flex-col justify-center">
              {renderScreen()}
            </div>
          </main>
          <footer className="text-center mt-6 text-gray-200">
            <div className="w-48 mx-auto border-t border-gray-500 my-4"></div>
            <p className="font-semibold text-xs">Keys for Community Heroes | Downtown Financial Group | NMLS #1830011 & #2072896</p>
            <p className="text-xs mt-1">Powered by Go Rascal</p>
            <p className="mt-2 px-4 text-xs">
              Not a commitment to lend. Subject to credit approval and state restrictions.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default App;
