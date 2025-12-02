export enum Category {
  Food = 'Food & Dining',
  Groceries = 'Groceries (Blinkit/Zepto)',
  Transport = 'Transport & Fuel',
  Utilities = 'Utilities & Bills',
  Shopping = 'Shopping',
  Housing = 'Housing/Rent',
  Entertainment = 'Entertainment',
  Health = 'Health & Medical',
  DomesticHelp = 'Domestic Help (Maid/Cook)',
  Investments = 'SIP & Investments',
  Salary = 'Salary & Income',
  Others = 'Others'
}

export enum PaymentMethod {
  UPI = 'UPI',
  Card = 'Card',
  NetBanking = 'Net Banking',
  Cash = 'Cash',
  Other = 'Other'
}

export type TransactionType = 'credit' | 'debit';

// New: Nature of Expense for NWLS Analysis + Adjustment for Opening Balances
export type TransactionNature = 'need' | 'want' | 'luxury' | 'saving' | 'income' | 'adjustment';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string; // ISO Date string
  type: TransactionType;
  paymentMethod: PaymentMethod;
  nature: TransactionNature; 
}

// Expanded Asset Types for v8.0 Granularity
export type AssetType = 
  | 'bank' 
  | 'credit' 
  | 'cash' 
  | 'receivable' 
  | 'deposit' // FD
  | 'stock'   // Indian Stocks
  | 'us_stock' 
  | 'fund'    // Mutual Funds
  | 'crypto' 
  | 'nps' 
  | 'epf' 
  | 'pf'      // Added for compatibility
  | 'elss'    // Added for compatibility
  | 'metal'   // Gold/Silver
  | 'real_estate' 
  | 'other';

export interface Asset {
  id: string;
  name: string; // Stock Symbol or Fund Name
  amount: number; // Current Total Value
  type: AssetType;
  asOfDate: string; // ISO Date String
  change?: number; // Optional percentage change
  // New fields for capital markets assets
  quantity?: number;
  costPerUnit?: number;
  currentPrice?: number;
}

export interface UserProfile {
  displayName: string;
  avatar: string | null;
  isOnboarded?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO Date string
  productLinks?: string[]; // New: Array of URLs
  productImages?: string[]; // New: Array of Base64 strings
}

export type BudgetMap = Record<string, number>; // Category -> Monthly Limit

export interface AIAnalysisResult {
  category: Category;
  nature: TransactionNature;
  confidence: number;
}

export type ViewState = 'login' | 'dashboard' | 'capital_markets' | 'wallets' | 'transactions' | 'analytics' | 'goals' | 'import';

export interface MonthlyMetric {
  monthKey: string;
  label: string;
  transactionCount: number;
  openingBalance: number;
  totalCredits: number;
  totalDebits: number;
  netChange: number;
  closingBalance: number;
}