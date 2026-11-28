import { Store, Calculator, Truck, Factory, Users, TrendingUp, Sprout } from 'lucide-react';

export const JOURNEYS = [
  { id: 'farmer', icon: Sprout, open: true, to: '/app/farm' },
  { id: 'entrepreneur', icon: Store, open: true, to: '/app/journey/entrepreneur' },
  { id: 'accountant', icon: Calculator, open: false },
  { id: 'supply', icon: Truck, open: false },
  { id: 'manufacturer', icon: Factory, open: false },
  { id: 'manager', icon: Users, open: false },
  { id: 'investor', icon: TrendingUp, open: false },
];

export const LEVEL_KEYS = ['beginner', 'apprentice', 'professional', 'expert'];
