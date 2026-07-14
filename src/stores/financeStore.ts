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
  Goal_From?: string;
  Goal_To?: string;
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

// Giữ lại các models cũ chưa xử lý trong Phase 1 (để tránh lỗi React code)
export interface LoanPhase { id: string; name: string; rate: number; durationMonths: number; }
export interface InvestmentCashflow { id: string; date: string; amount: number; type: 'IN' | 'OUT'; description?: string; }
export interface Goal {
  Goal_ID: string;
  Goal_Name: string;
  Target_Amount: number;
  Current_Amount: number;
  Goal_Type: string;
  Allocated_Percentage: number;
  Owner_User_ID: string;
  Privacy_Tag: string;

  // Legacy
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  type?: string;
  category?: string;
  deadline?: string;
  priority?: number;
  loanPhases?: any[];
}

export interface Investment { id: string; name: string; type: 'Short' | 'Mid' | 'Long'; expectedYield: number; currentAmount: number; cashflows: InvestmentCashflow[]; updatedAt?: string; }
export interface StagingTransaction extends Omit<Transaction, 'status' | 'Status'> {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

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

  fetchGoals: () => Promise<void>;
  createGoal: (g: Partial<Goal>) => Promise<boolean>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Legacy mappings for old dashboard code (will be refactored gradually)
  fetchPnL: () => Promise<void>;
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
          const res = await fetch(`${gasUrl}?action=getAccounts&userId=${currentUser.User_ID}&role=${currentUser.Role}&_t=${Date.now()}`);
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
          const res = await fetch(`${gasUrl}?action=getTransactions&userId=${currentUser.User_ID}&role=${currentUser.Role}&_t=${Date.now()}`);
          const data = await res.json();
          if (data.success) {
            const mapped = data.data.map((tx: any) => ({
              ...tx,
              id: tx.Transaction_ID,
              amount: Number(tx.Amount_VND || tx.Amount_Original),
              category: tx.Category_ID,
              type: tx.Transaction_Type === 'INCOME' ? 'Revenue' : 'Expense', // legacy mapping
              description: tx.Description,
              timestamp: tx.Transaction_Date
            }));
            set({ transactions: mapped, isLoading: false });
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
          Created_At: new Date().toISOString(),
          // Legacy mappings for optimistic UI
          id: tempId,
          amount: Number(tx.Amount_VND || tx.Amount_Original || tx.amount || 0),
          category: tx.Category_ID || tx.category || '',
          type: tx.Transaction_Type === 'INCOME' || tx.type === 'Revenue' ? 'Revenue' : 'Expense',
          description: tx.Description || tx.description || '',
          timestamp: tx.Transaction_Date || tx.timestamp || new Date().toISOString()
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
      
      fetchGoals: async () => {
        const { gasUrl, currentUser } = get();
        if (!gasUrl || !currentUser) return;
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${gasUrl}?action=getGoals&userId=${currentUser.User_ID}&role=${currentUser.Role}&_t=${Date.now()}`);
          const data = await res.json();
          if (data.success) {
            // Map legacy fields
            const goalsData = data.data.map((g: any) => ({
              ...g,
              id: g.Goal_ID,
              name: g.Goal_Name,
              currentAmount: Number(g.Current_Amount),
              targetAmount: Number(g.Target_Amount),
              category: g.Goal_Type,
              type: 'General'
            }));
            set({ goals: goalsData, isLoading: false });
          } else {
            set({ error: data.message, isLoading: false });
          }
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },

      createGoal: async (g) => {
        const tempId = `temp_${Date.now()}`;
        const newGoal = {
          Goal_ID: tempId,
          id: tempId,
          Goal_Name: g.Goal_Name || '',
          name: g.Goal_Name || '',
          Current_Amount: g.Current_Amount || 0,
          currentAmount: g.Current_Amount || 0,
          Target_Amount: g.Target_Amount || 0,
          targetAmount: g.Target_Amount || 0,
          Goal_Type: g.Goal_Type || 'Savings',
          Allocated_Percentage: g.Allocated_Percentage || 0,
          Owner_User_ID: g.Owner_User_ID || '',
          Privacy_Tag: g.Privacy_Tag || 'FAMILY'
        } as Goal;

        set(state => ({ goals: [...state.goals, newGoal] }));

        const { gasUrl, secureToken } = get();
        try {
          const res = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'create_goal', secureToken, data: newGoal })
          });
          const data = await res.json();
          if (data.success) {
            set(state => ({
              goals: state.goals.map(x => x.Goal_ID === tempId ? { ...x, Goal_ID: data.data.id, id: data.data.id } : x)
            }));
            return true;
          }
        } catch (err) {}
        return false;
      },

      updateGoal: async (id, updates) => {
        set(state => ({
          goals: state.goals.map(g => g.Goal_ID === id ? { ...g, ...updates, currentAmount: updates.Current_Amount ?? g.currentAmount } : g)
        }));
        const { gasUrl, secureToken } = get();
        await fetch(gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'update_goal', secureToken, goalId: id, updates })
        });
      },

      deleteGoal: async (id) => {
        set(state => ({ goals: state.goals.filter(g => g.Goal_ID !== id) }));
        const { gasUrl, secureToken } = get();
        await fetch(gasUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'delete_goal', secureToken, goalId: id })
        });
      },

      saveGoals: async () => { /* Mock */ },
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
