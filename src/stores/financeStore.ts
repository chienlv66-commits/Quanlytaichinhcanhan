import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---- NEW MODELS (Phase 1) ----

export interface User {
  User_ID: string;
  Username?: string;
  Full_Name: string;
  Role: 'ADMIN' | 'SPOUSE' | 'MEMBER' | 'VIEWER';
  Status: string;
}

export interface Account {
  Account_ID: string;
  Account_Name: string;
  Account_Type: string;
  Owner_User_ID: string;
  Privacy_Tag: 'FAMILY' | 'PERSONAL' | 'BUSINESS' | 'SHARED';
  Currency: 'VND' | 'USD';
  Current_Balance: number;
  Exchange_Rate: number;
  Is_Included_In_Net_Worth: boolean;
}

export interface Transaction {
  Transaction_ID: string;
  Transaction_Date: string;
  Transaction_Type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'GOAL_ALLOCATION' | 'INVESTMENT_BUY' | 'INVESTMENT_SELL' | 'DEBT_PAYMENT';
  Status: 'DRAFT' | 'PENDING' | 'POSTED' | 'VOID' | 'REJECTED';
  Account_From: string;
  Account_To: string;
  Category_ID: string;
  Amount_Original: number;
  Currency: string;
  Exchange_Rate: number;
  Amount_VND: number;
  Goal_ID?: string;
  Investment_ID?: string;
  Debt_ID?: string;
  Description: string;
  Privacy_Tag: 'FAMILY' | 'PERSONAL' | 'BUSINESS' | 'SHARED';
  Owner_User_ID: string;
  Created_By: string;
  Created_At: string;
  Updated_At: string;

  // Legacy properties for old components (Phase 1 transitional)
  amount: number;
  category: string;
  type: string;
  timestamp: string;
  id: string;
  source: string;
  description: string;
  status?: string;
}

export interface StagingTransaction extends Omit<Transaction, 'status' | 'Status'> {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// Giữ lại các models cũ chưa xử lý trong Phase 1 (để tránh lỗi React code)
export interface LoanPhase { id: string; name: string; rate: number; durationMonths: number; }
export interface InvestmentCashflow { id: string; date: string; amount: number; type: 'IN' | 'OUT'; description?: string; }
export interface Investment { id: string; name: string; type: 'Short' | 'Mid' | 'Long'; expectedYield: number; currentAmount: number; cashflows: InvestmentCashflow[]; updatedAt?: string; }
export interface Goal { id: string; name: string; targetAmount: number; currentAmount: number; type: 'House' | 'Car' | 'Business' | 'Emergency' | 'General'; allocatedPercentage: number; priority: number; category?: 'Needs' | 'Wants' | 'Savings'; loanPhases?: LoanPhase[]; loanInterestRate?: number; loanTermMonths?: number; updatedAt?: string; }

interface FinanceState {
  // Cấu hình
  gasUrl: string;
  secureToken: string;
  
  // Auth
  currentUser: User | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;

  // Dữ liệu
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  investments: Investment[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setGasUrl: (url: string) => void;
  setSecureToken: (token: string) => void;
  
  fetchAccounts: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  createTransaction: (tx: Partial<Transaction>) => Promise<boolean>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Legacy mappings for old dashboard code (will be refactored gradually)
  fetchPnL: () => Promise<void>;
  fetchGoals: () => Promise<void>;
  saveGoals: (g: any) => Promise<void>;
  fetchInvestments: () => Promise<void>;
  saveInvestments: (i: any) => Promise<void>;
  childBudgetWeekly: number;
  addManualTransaction: (tx: any) => Promise<void>;
  setUserRole: (role: any) => void;
  updateGoalAmount: (goalId: string, addedAmount: number) => Promise<void>;
  staging: StagingTransaction[];
  fetchStaging: () => Promise<void>;
  approveStaging: (transactionId: string, updates: Partial<Transaction>) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      accounts: [],
      transactions: [],
      goals: [],
      investments: [],
      gasUrl: '',
      secureToken: 'LUCEA-2026',
      isLoading: false,
      error: null,
      
      setGasUrl: (url) => set({ gasUrl: url }),
      setSecureToken: (token) => set({ secureToken: token }),

      login: async (username, password) => {
        const { gasUrl } = get();
        if (!gasUrl) { set({ error: 'GAS URL not configured' }); return false; }
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'login', data: { username, password } })
          });
          const data = await res.json();
          if (data.success) {
            set({ currentUser: data.data, isLoading: false });
            return true;
          } else {
            set({ error: data.message, isLoading: false });
            return false;
          }
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ currentUser: null, accounts: [], transactions: [] });
      },

      fetchAccounts: async () => {
        const { gasUrl, currentUser } = get();
        if (!gasUrl || !currentUser) return;
        set({ isLoading: true });
        try {
          const res = await fetch(`${gasUrl}?action=getAccounts&userId=${currentUser.User_ID}&role=${currentUser.Role}`);
          const data = await res.json();
          if (data.success) {
            set({ accounts: data.data, isLoading: false });
          } else {
            set({ error: data.message, isLoading: false });
          }
        } catch (e: any) {
          set({ error: e.message, isLoading: false });
        }
      },

      fetchTransactions: async () => {
        const { gasUrl, currentUser } = get();
        if (!gasUrl || !currentUser) return;
        set({ isLoading: true });
        try {
          const res = await fetch(`${gasUrl}?action=getTransactions&userId=${currentUser.User_ID}&role=${currentUser.Role}`);
          const data = await res.json();
          if (data.success) {
            set({ transactions: data.data, isLoading: false });
          } else {
            set({ error: data.message, isLoading: false });
          }
        } catch (e: any) {
          set({ error: e.message, isLoading: false });
        }
      },

      createTransaction: async (tx) => {
        const { gasUrl, secureToken, currentUser } = get();
        if (!gasUrl || !currentUser) { set({ error: 'Not logged in or GAS URL missing' }); return false; }

        const tempId = `temp_${Date.now()}`;
        const newTx = {
          ...tx,
          Transaction_ID: tempId,
          Status: 'POSTED',
          Owner_User_ID: currentUser.User_ID,
          Created_By: currentUser.User_ID,
          Created_At: new Date().toISOString()
        } as Transaction;

        set(state => ({ transactions: [newTx, ...state.transactions] }));

        try {
          const res = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'create_transaction', secureToken, data: newTx })
          });
          const data = await res.json();
          if (data.success) {
             // Thay tempId bằng ID thực từ server
             set(state => ({
               transactions: state.transactions.map(t => t.Transaction_ID === tempId ? { ...t, Transaction_ID: data.data.id } : t)
             }));
             return true;
          } else {
             // Rollback
             set(state => ({
               transactions: state.transactions.filter(t => t.Transaction_ID !== tempId),
               error: data.message
             }));
             return false;
          }
        } catch (err: any) {
          // Rollback
          set(state => ({
            transactions: state.transactions.filter(t => t.Transaction_ID !== tempId),
            error: err.message
          }));
          return false;
        }
      },

      updateTransaction: async (id, updates) => {
        // Optimistic update
        set(state => ({
          transactions: state.transactions.map(t => t.Transaction_ID === id ? { ...t, ...updates } : t)
        }));
        
        const { gasUrl, secureToken } = get();
        await fetch(gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'update_transaction', secureToken, transactionId: id, updates })
        });
      },

      deleteTransaction: async (id) => {
        set(state => ({
          transactions: state.transactions.filter(t => t.Transaction_ID !== id)
        }));
        
        const { gasUrl, secureToken } = get();
        await fetch(gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'delete_transaction', secureToken, transactionId: id })
        });
      },

      // Legacy fallback (Will remove in Phase 4)
      fetchPnL: async () => { get().fetchTransactions(); },
      fetchGoals: async () => { /* Mock for now */ },
      saveGoals: async () => { /* Mock for now */ },
      fetchInvestments: async () => { /* Mock */ },
      saveInvestments: async () => { /* Mock */ },
      childBudgetWeekly: 500000,
      addManualTransaction: async (tx: any) => { /* Mock */ },
      setUserRole: (role: any) => { /* Mock */ },
      updateGoalAmount: async (goalId: string, addedAmount: number) => { /* Mock */ },
      staging: [],
      fetchStaging: async () => { /* Mock */ },
      approveStaging: async (transactionId: string, updates: Partial<Transaction>) => { /* Mock */ }
    }),
    {
      name: 'finance-storage-v2',
      partialize: (state) => ({ 
        gasUrl: state.gasUrl, 
        secureToken: state.secureToken,
        currentUser: state.currentUser 
      }),
    }
  )
);
