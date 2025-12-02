/* @vite-ignore */
import { Category, Transaction, Asset, Goal } from './types';

export const INDIAN_RUPEE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export const USD_CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCNVzTY9CXY7J_qWPxivPK-EkZgKUcK6Ic",
  authDomain: "webot-scm5f.firebaseapp.com",
  projectId: "webot-scm5f",
  storageBucket: "webot-scm5f.firebasestorage.app",
  messagingSenderId: "634655886203",
  appId: "1:634655886203:web:3313a4d57bce49d8ec8bde"
} as const;

export const INITIAL_EXPENSES: Transaction[] = [];
export const INITIAL_ASSETS: Asset[] = [];
export const INITIAL_GOALS: Goal[] = [];

export const CATEGORY_COLORS: Record<Category, string> = {
  [Category.Food]: '#3B82F6',
  [Category.Groceries]: '#6366F1',
  [Category.Transport]: '#0EA5E9',
  [Category.Utilities]: '#8B5CF6',
  [Category.Shopping]: '#EC4899',
  [Category.Housing]: '#F59E0B',
  [Category.DomesticHelp]: '#F43F5E',
  [Category.Entertainment]: '#D946EF',
  [Category.Health]: '#06B6D4',
  [Category.Investments]: '#2563EB',
  [Category.Salary]: '#8B5CF6',
  [Category.Others]: '#64748B',
};

export const PIE_CHART_COLORS = [
  '#3B82F6', '#6366F1', '#8B5CF6', '#F59E0B', '#EC4899', '#64748B', '#D946EF', '#0EA5E9'
];