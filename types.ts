export enum Screen {
  Welcome,
  Role,
  Price,
  DownPayment,
  Teaser,
  Confirmation,
}

export type HeroRole =
  | 'Police Officer'
  | 'Firefighter / EMT'
  | 'Nurse / Healthcare Worker'
  | 'Military / Veteran'
  | 'Teacher / Educator'
  | 'Skilled Trade / Union Worker'
  | 'Blue-Collar Worker'
  | 'Other Hero';

export interface FormData {
  heroRole: HeroRole | null;
  homePrice: number;
  downPaymentPercent: number;
  name: string;
  email: string;
  phone: string;
  wantsText: boolean;
  tcpaConsent: boolean;
}

export interface SavingsData {
  loanAmount: number;
  heroCredit: number;
  minSavings: number;
  maxSavings: number;
}

export interface GeneratedContent {
  email: {
    subject: string;
    body: string;
  };
  sms: {
    body: string;
  };
}