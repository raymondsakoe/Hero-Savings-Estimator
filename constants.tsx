import React from 'react';
import type { HeroRole } from './types';

import { PoliceIcon, FirefighterIcon, NurseIcon, MilitaryIcon, TeacherIcon, TradeIcon, WorkerIcon, OtherHeroIcon } from './components/icons/HeroIcons';

export const HERO_ROLES: { name: HeroRole; icon: JSX.Element }[] = [
  { name: 'Police Officer', icon: <PoliceIcon /> },
  { name: 'Firefighter / EMT', icon: <FirefighterIcon /> },
  { name: 'Nurse / Healthcare Worker', icon: <NurseIcon /> },
  { name: 'Military / Veteran', icon: <MilitaryIcon /> },
  { name: 'Teacher / Educator', icon: <TeacherIcon /> },
  { name: 'Skilled Trade / Union Worker', icon: <TradeIcon /> },
  { name: 'Blue-Collar Worker', icon: <WorkerIcon /> },
  { name: 'Other Hero', icon: <OtherHeroIcon /> },
];

export const QUICK_PRICES = [250000, 500000, 750000, 1000000];

export const DOWN_PAYMENT_OPTIONS = [3, 5, 10, 20];

export const TOTAL_STEPS = 4; // Role, Price, DownPayment, Teaser

export const GUARANTEED_SAVINGS = 850;
export const MIN_BONUS_SAVINGS = 250;
export const MAX_BONUS_SAVINGS = 550;

export const TESTIMONIALS = [
  {
    quote: "The process was so simple and the savings were incredible. As a firefighter, my schedule is hectic, but they made everything easy. Truly a program for heroes.",
    name: "Mark R.",
    role: "Firefighter / EMT"
  },
  {
    quote: "I never thought I'd be able to afford a home for my family. This program made it possible. The team was supportive and guided me every step of the way.",
    name: "Jessica P.",
    role: "Nurse / Healthcare Worker"
  },
  {
    quote: "After my service, I wanted to plant roots. The Hero Savings program honored my time in the military with real, tangible benefits. Highly recommend to any veteran.",
    name: "David C.",
    role: "Military / Veteran"
  },
  {
      quote: "As a teacher, every dollar counts. The savings from this program made a huge difference in our budget. We're so grateful for the support.",
      name: "Sarah L.",
      role: "Teacher / Educator"
  }
];
