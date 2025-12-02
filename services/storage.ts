import { Transaction, Asset, UserProfile, Goal, BudgetMap, Category } from '../types';
import { INITIAL_EXPENSES, INITIAL_ASSETS, INITIAL_GOALS } from '../constants';

const STORAGE_KEYS = {
  TRANSACTIONS: 'vizbot_transactions',
  ASSETS: 'vizbot_assets',
  AVAILABLE_MONTHS: 'vizbot_available_months',
  USER_PROFILE: 'vizbot_user_profile',
  GOALS: 'vizbot_goals',
  BUDGETS: 'vizbot_budgets'
};

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Trader',
  avatar: null,
  isOnboarded: false
};

const DEFAULT_BUDGETS: BudgetMap = {
  [Category.Food]: 5000,
  [Category.Groceries]: 8000,
  [Category.Transport]: 3000,
  [Category.Utilities]: 4000,
  [Category.Shopping]: 5000,
  [Category.Housing]: 15000,
  [Category.Entertainment]: 2000,
  [Category.Health]: 2000,
  [Category.DomesticHelp]: 3000,
  [Category.Investments]: 20000,
  [Category.Others]: 5000
};

export const storageService = {
  getTransactions: (): Transaction[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : INITIAL_EXPENSES;
    } catch (e) {
      return INITIAL_EXPENSES;
    }
  },

  saveTransaction: (transaction: Transaction) => {
    const current = storageService.getTransactions();
    const updated = [transaction, ...current];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
    return updated;
  },

  updateTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getAssets: (): Asset[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ASSETS);
      return data ? JSON.parse(data) : INITIAL_ASSETS;
    } catch (e) {
      return INITIAL_ASSETS;
    }
  },

  saveAssets: (assets: Asset[]) => {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
  },

  getAvailableMonths: (): string[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.AVAILABLE_MONTHS);
        if (!data) {
            const now = new Date();
            const currentStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });
            return [currentStr];
        }
        return JSON.parse(data);
    } catch {
        const now = new Date();
        return [now.toLocaleString('default', { month: 'long', year: 'numeric' })];
    }
  },

  saveAvailableMonths: (months: string[]) => {
    localStorage.setItem(STORAGE_KEYS.AVAILABLE_MONTHS, JSON.stringify(months));
  },

  getUserProfile: (): UserProfile => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  saveUserProfile: (profile: UserProfile) => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  },

  getGoals: (): Goal[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : INITIAL_GOALS;
    } catch (e) {
      return INITIAL_GOALS;
    }
  },

  saveGoals: (goals: Goal[]) => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  },

  getBudgets: (): BudgetMap => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      return data ? JSON.parse(data) : DEFAULT_BUDGETS;
    } catch (e) {
      return DEFAULT_BUDGETS;
    }
  },

  saveBudgets: (budgets: BudgetMap) => {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  },

  exportData: () => {
    const data = {
      transactions: storageService.getTransactions(),
      assets: storageService.getAssets(),
      profile: storageService.getUserProfile(),
      months: storageService.getAvailableMonths(),
      goals: storageService.getGoals(),
      budgets: storageService.getBudgets(),
      date: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.transactions) storageService.updateTransactions(data.transactions);
      if (data.assets) storageService.saveAssets(data.assets);
      if (data.profile) storageService.saveUserProfile(data.profile);
      if (data.months) storageService.saveAvailableMonths(data.months);
      if (data.goals) storageService.saveGoals(data.goals);
      if (data.budgets) storageService.saveBudgets(data.budgets);
      
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
  }
};