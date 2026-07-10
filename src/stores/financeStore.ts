import { create } from 'zustand';
import { persist } from 'zustand/middleware';


// Mô hình dữ liệu P&L
export interface Transaction {
  id: string;
  timestamp: string;
  type: 'Revenue' | 'COGS' | 'OPEX' | 'Non-Operating' | 'Non-P&L';
  amount: number; // Stored in VND
  originalAmount?: number; // E.g., 100 (USD)
  currency?: 'VND' | 'USD';
  category: string;
  description: string;
  source: string;
  status?: 'PENDING' | 'APPROVED';
}

export interface StagingTransaction extends Omit<Transaction, 'status'> {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface LoanPhase {
  id: string;
  name: string; // e.g., 'Vay người thân', 'Ưu đãi năm đầu', 'Thả nổi'
  rate: number; // Lãi suất % / năm
  durationMonths: number; // Thời gian áp dụng
}

export interface InvestmentCashflow {
  id: string;
  date: string;
  amount: number;
  type: 'IN' | 'OUT';
  description?: string;
}

export interface Investment {
  id: string;
  name: string;
  type: 'Short' | 'Mid' | 'Long';
  expectedYield: number; // % / năm
  currentAmount: number;
  cashflows: InvestmentCashflow[];
  updatedAt?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  type: 'House' | 'Car' | 'Business' | 'Emergency' | 'General';
  allocatedPercentage: number;
  priority: number; // 1 = cao nhất
  category?: 'Needs' | 'Wants' | 'Savings';
  loanPhases?: LoanPhase[];
  loanInterestRate?: number;
  loanTermMonths?: number;
  updatedAt?: string;
}

interface FinanceState {
  // Cấu hình
  gasUrl: string;
  secureToken: string;
  userRole: 'admin' | 'child' | null;
  childBudgetWeekly: number;
  exchangeRate: number; // VND per USD
  
  // Dữ liệu
  transactions: Transaction[];
  staging: StagingTransaction[];
  goals: Goal[];
  investments: Investment[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setGasUrl: (url: string) => void;
  setSecureToken: (token: string) => void;
  setUserRole: (role: 'admin' | 'child' | null) => void;
  setChildBudgetWeekly: (limit: number) => void;
  updateExchangeRate: () => Promise<void>;
  fetchPnL: () => Promise<void>;
  fetchStaging: () => Promise<void>;
  fetchGoals: () => Promise<void>;
  saveGoals: (goals: Goal[]) => Promise<void>;
  updateGoalAmount: (goalId: string, addedAmount: number) => Promise<void>;
  fetchInvestments: () => Promise<void>;
  saveInvestments: (investments: Investment[]) => Promise<void>;
  approveStaging: (transactionId: string, updates: Partial<Transaction>) => Promise<void>;
  addManualTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: [],
      staging: [],
      goals: [],
      investments: [],
      gasUrl: '',
      secureToken: 'LUCEA-2026', // Default token for simplicity
      userRole: null,
      childBudgetWeekly: 500000, // 500,000 VND default
      exchangeRate: 25400, // Default fallback
      isLoading: false,
      error: null,
      
      setGasUrl: (url) => set({ gasUrl: url }),
      setSecureToken: (token) => set({ secureToken: token }),
      setUserRole: (role) => set({ userRole: role }),
      setChildBudgetWeekly: (limit) => set({ childBudgetWeekly: limit }),

      updateExchangeRate: async () => {
        try {
          const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          if (res.ok) {
            const data = await res.json();
            if (data && data.rates && data.rates.VND) {
              set({ exchangeRate: data.rates.VND });
            }
          }
        } catch (e) {
          console.error("Lỗi cập nhật tỷ giá:", e);
        }
      },
      
      fetchPnL: async () => {
        const { gasUrl } = get();
        if (!gasUrl) { set({ error: 'GAS URL not configured' }); return; }
        
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${gasUrl}?action=getPnL`);
          const data = await res.json();
          if (data.status === 'success') {
            // Chuẩn hoá dữ liệu (key từ Google Sheet có thể bị viết hoa chữ cái đầu)
            const normalizedData = data.data.map((item: any) => ({
              id: item.id || item.ID || String(Math.random()),
              timestamp: item.timestamp || item.Timestamp || new Date().toISOString(),
              type: item.type || item.Type,
              amount: item.amount || item.Amount || 0,
              category: item.category || item.Category,
              description: item.description || item.Description,
              source: item.source || item.Source,
            }));
            set({ transactions: normalizedData, isLoading: false });
          } else {
            set({ error: data.message || 'Failed to fetch PnL', isLoading: false });
          }
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },
      
      fetchStaging: async () => {
        const { gasUrl } = get();
        if (!gasUrl) { set({ error: 'GAS URL not configured' }); return; }
        
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${gasUrl}?action=getStaging`);
          const data = await res.json();
          if (data.status === 'success') {
            const normalizedData = data.data.map((item: any) => ({
              id: item.id || item.ID || String(Math.random()),
              timestamp: item.timestamp || item.Timestamp || new Date().toISOString(),
              type: item.type || item.Type,
              amount: item.amount || item.Amount || 0,
              category: item.category || item.Category,
              description: item.description || item.Description,
              source: item.source || item.Source,
              status: item.status || item.Status,
            }));
            set({ staging: normalizedData, isLoading: false });
          } else {
            set({ error: data.message || 'Failed to fetch Staging', isLoading: false });
          }
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
        }
      },
      
      fetchGoals: async () => {
        const { gasUrl } = get();
        if (!gasUrl) return;
        
        try {
          const res = await fetch(`${gasUrl}?action=getGoals`);
          const data = await res.json();
          if (data.status === 'success') {
            const normalizedData = data.data.map((item: any) => ({
              id: item.id || item.ID || String(Math.random()),
              name: item.name || item.Name || 'Goal',
              targetAmount: item.targetAmount || item.TargetAmount || 0,
              currentAmount: item.currentAmount || item.CurrentAmount || 0,
              type: item.type || item.Type || 'General',
              allocatedPercentage: item.allocatedPercentage || item.AllocatedPercentage || 0,
              priority: item.priority || item.Priority || 1,
              loanPhases: item.loanPhases ? JSON.parse(item.loanPhases) : (item.LoanPhases ? JSON.parse(item.LoanPhases) : []),
              loanInterestRate: item.loanInterestRate || item.LoanInterestRate || 0,
              loanTermMonths: item.loanTermMonths || item.LoanTermMonths || 0,
              updatedAt: item.updatedAt || item.UpdatedAt || new Date().toISOString(),
            }));
            set({ goals: normalizedData });
          }
        } catch (err: any) {
          console.error("Lỗi fetch Goals:", err.message);
        }
      },

      saveGoals: async (newGoals: Goal[]) => {
        const { gasUrl, secureToken } = get();
        if (!gasUrl) return;
        
        set({ goals: newGoals }); // Optimistic update
        try {
          await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
              action: 'save_goals',
              secureToken,
              data: newGoals
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
        } catch (err: any) {
          console.error("Lỗi save Goals:", err.message);
        }
      },

      fetchInvestments: async () => {
        const { gasUrl } = get();
        if (!gasUrl) return;
        
        try {
          const res = await fetch(`${gasUrl}?action=getInvestments`);
          const data = await res.json();
          if (data.status === 'success') {
            const normalizedData = data.data.map((item: any) => ({
              id: item.id || item.ID || String(Math.random()),
              name: item.name || item.Name || 'Investment',
              type: item.type || item.Type || 'Short',
              expectedYield: item.expectedYield || item.ExpectedYield || 0,
              currentAmount: item.currentAmount || item.CurrentAmount || 0,
              cashflows: item.cashflows ? JSON.parse(item.cashflows) : (item.Cashflows ? JSON.parse(item.Cashflows) : []),
              updatedAt: item.updatedAt || item.UpdatedAt || new Date().toISOString(),
            }));
            set({ investments: normalizedData });
          }
        } catch (err: any) {
          console.error("Lỗi fetch Investments:", err.message);
        }
      },

      saveInvestments: async (newInvestments: Investment[]) => {
        const { gasUrl, secureToken } = get();
        if (!gasUrl) return;
        
        set({ investments: newInvestments });
        try {
          await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
              action: 'save_investments',
              secureToken,
              data: newInvestments
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
        } catch (err: any) {
          console.error("Lỗi save Investments:", err.message);
        }
      },

      updateGoalAmount: async (goalId: string, addedAmount: number) => {
        const currentGoals = get().goals;
        const updatedGoals = currentGoals.map(g => {
          if (g.id === goalId) {
            return { ...g, currentAmount: g.currentAmount + addedAmount, updatedAt: new Date().toISOString() };
          }
          return g;
        });
        await get().saveGoals(updatedGoals);
      },

      approveStaging: async (transactionId, updates) => {
        const { gasUrl, staging, secureToken } = get();
        if (!gasUrl) { set({ error: 'GAS URL not configured' }); return; }
        
        const approvedTx = staging.find(t => t.id === transactionId);
        set({ staging: staging.filter(t => t.id !== transactionId) });
        
        try {
          const res = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
              action: 'approve_staging',
              secureToken,
              transactionId,
              updates
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
          const data = await res.json();
          
          if (data.status === 'success') {
            get().fetchPnL();
          } else {
            if (approvedTx) set({ staging: [...get().staging, approvedTx], error: data.message });
          }
        } catch (err: any) {
          if (approvedTx) set({ staging: [...get().staging, approvedTx], error: err.message });
        }
      },
      
      addManualTransaction: async (txData) => {
        const { gasUrl, secureToken } = get();
        if (!gasUrl) {
          alert('Vui lòng cấu hình URL Google Apps Script trong Cài đặt.');
          return;
        }

        const newTx = { ...txData, id: Date.now().toString(), timestamp: new Date().toISOString() };
        
        set((state) => ({
          transactions: [...state.transactions, newTx as Transaction]
        }));
        
        try {
          await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
              action: 'manual_insert',
              secureToken,
              data: newTx
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
          });
        } catch (err: any) {
          console.error("Lỗi addManualTransaction:", err.message);
        }
      }
    }),
    {
      name: 'finance-storage',
      partialize: (state) => ({ 
        gasUrl: state.gasUrl, 
        transactions: state.transactions,
        userRole: state.userRole,
        childBudgetWeekly: state.childBudgetWeekly,
        secureToken: state.secureToken,
        exchangeRate: state.exchangeRate,
        goals: state.goals // Ensure goals are persisted offline
      }),
    }
  )
);
