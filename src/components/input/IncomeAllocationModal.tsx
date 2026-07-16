"use client";

import React, { useState, useEffect } from 'react';
import { useFinanceStore, Goal, LoanPhase } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Target, X, Zap, HandCoins } from 'lucide-react';

export default function IncomeAllocationModal({ 
  incomeAmount,
  incomeCategory,
  onClose 
}: { 
  incomeAmount: number; 
  incomeCategory?: string;
  onClose: () => void; 
}) {
  const { goals, updateGoalAmount } = useFinanceStore();
  const [allocations, setAllocations] = useState<{ goalId: string, amount: number, percentage: number, reason: string, checked: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoAllocateSavings, setAutoAllocateSavings] = useState(true);

  const isSalary = incomeCategory === 'Lương & Thu nhập cố định';

  // Tính toán số tiền trả góp hàng tháng ước tính cho giai đoạn hiện tại (giai đoạn 1)
  const calculateMonthlyPayment = (g: Goal) => {
    if (!g.loanPhases || g.loanPhases.length === 0) return 0;
    const currentPhase = g.loanPhases[0];
    const principal = g.targetAmount - g.currentAmount;
    if (principal <= 0) return 0;
    
    const totalDuration = g.loanPhases.reduce((acc, p) => acc + p.durationMonths, 0);
    const principalPerMonth = principal / (totalDuration || 1);
    
    const interestPerMonth = principal * (currentPhase.rate / 100 / 12);
    return principalPerMonth + interestPerMonth;
  };

  useEffect(() => {
    if (goals.length > 0) {
      const newAllocations: { goalId: string, amount: number, percentage: number, reason: string, checked: boolean }[] = [];
      const hasSavings = goals.some(g => !g.category || ['Savings', 'Tích lũy', 'Tích luỹ'].includes(g.category));
      
      if (isSalary) {
        // 50/30/20 Rule cho Lương
        const needsAmount = Math.round(incomeAmount * 0.5);
        const wantsAmount = Math.round(incomeAmount * 0.3);
        const savingsAmount = incomeAmount - needsAmount - wantsAmount;
        
        const needsPct = 50;
        const wantsPct = 30;
        const savingsPct = 20;

        const needsGoals = goals.filter(g => g.category === 'Needs' || g.category === 'Thiết yếu');
        const wantsGoals = goals.filter(g => g.category === 'Wants' || g.category === 'Linh hoạt');
        const savingsGoals = goals.filter(g => !g.category || ['Savings', 'Tích lũy', 'Tích luỹ'].includes(g.category)).sort((a, b) => (a.priority || 1) - (b.priority || 1));

        if (autoAllocateSavings) {
          if (savingsGoals.length > 0) {
            newAllocations.push({ goalId: savingsGoals[0].id, amount: savingsAmount, percentage: savingsPct, reason: 'Quy tắc 50/30/20 (20% Tích luỹ)', checked: true });
          } else {
            // Không có quỹ tích luỹ
          }
        }

        // Phân bổ Needs (Chia đều nếu có nhiều quỹ Needs)
        if (needsGoals.length > 0) {
          const perGoal = Math.round(needsAmount / needsGoals.length);
          needsGoals.forEach(g => {
            newAllocations.push({ goalId: g.id, amount: perGoal, percentage: 0, reason: 'Quy tắc 50% (Thiết yếu)', checked: true });
          });
        }

        // Phân bổ Wants (Chia đều nếu có nhiều quỹ Wants)
        if (wantsGoals.length > 0) {
          const perGoal = Math.round(wantsAmount / wantsGoals.length);
          wantsGoals.forEach(g => {
            newAllocations.push({ goalId: g.id, amount: perGoal, percentage: 0, reason: 'Quy tắc 30% (Linh hoạt)', checked: true });
          });
        }

        // Phân bổ Savings (20%) bằng AI Priority
        let remainingSavings = savingsAmount;
        
        // 1. Trả nợ tối thiểu
        for (const g of savingsGoals) {
          const monthlyPayment = calculateMonthlyPayment(g);
          if (monthlyPayment > 0 && remainingSavings > 0) {
            const allocAmount = Math.min(monthlyPayment, remainingSavings);
            remainingSavings -= allocAmount;
            newAllocations.push({ goalId: g.id, amount: allocAmount, percentage: 0, reason: `Ưu tiên trả nợ (${g.loanPhases![0].rate}%)`, checked: true });
          }
        }

        // 2. Dồn tiền dư vào quỹ ưu tiên
        for (const g of savingsGoals) {
          if (remainingSavings <= 0) break;
          const remainingTarget = g.targetAmount - g.currentAmount;
          if (remainingTarget > 0) {
            const existing = newAllocations.find(a => a.goalId === g.id);
            const currentAlloc = existing ? existing.amount : 0;
            const shortfall = remainingTarget - currentAlloc;
            
            if (shortfall > 0) {
              const allocAmount = Math.min(shortfall, remainingSavings);
              remainingSavings -= allocAmount;
              
              if (existing) {
                existing.amount += allocAmount;
                existing.reason += ` + Đẩy nhanh (Ưu tiên ${g.priority})`;
              } else {
                newAllocations.push({ goalId: g.id, amount: allocAmount, percentage: 0, reason: `AI Đẩy nhanh (Ưu tiên ${g.priority})`, checked: true });
              }
            }
          }
        }

        // Add goals with 0 allocation
        goals.forEach(g => {
          if (!newAllocations.find(a => a.goalId === g.id)) {
            newAllocations.push({ goalId: g.id, amount: 0, percentage: 0, reason: 'Chưa được phân bổ', checked: false });
          }
        });

      } else {
        // Thu nhập khác: mặc định chọn autoAllocateSavings và tự động dồn vào Tích luỹ
        goals.forEach(g => {
          newAllocations.push({ goalId: g.id, amount: 0, percentage: 0, reason: 'Chưa phân bổ', checked: false });
        });
      }

      // Tính toán lại % 
      const finalAllocations = newAllocations.map(a => ({
        ...a,
        percentage: incomeAmount > 0 ? Number(((a.amount / incomeAmount) * 100).toFixed(1)) : 0
      }));

      setAllocations(finalAllocations);
    }
  }, [goals, incomeAmount, isSalary]);

  const handlePercentageChange = (goalId: string, pct: number) => {
    const newPct = Math.min(100, Math.max(0, pct));
    const newAmount = Math.round((incomeAmount * newPct) / 100);
    setAllocations(prev => prev.map(a => a.goalId === goalId ? { ...a, percentage: newPct, amount: newAmount, checked: true, reason: 'Tự điều chỉnh' } : a));
  };

  const handleAmountChange = (goalId: string, amount: number) => {
    const newAmount = Math.max(0, amount);
    const newPct = incomeAmount > 0 ? (newAmount / incomeAmount) * 100 : 0;
    setAllocations(prev => prev.map(a => a.goalId === goalId ? { ...a, percentage: Number(newPct.toFixed(1)), amount: newAmount, checked: true, reason: 'Tự điều chỉnh' } : a));
    // Tự động vô hiệu hoá autoAllocateSavings nếu người dùng tự sửa tay 1 quỹ Tích lũy
    const goal = goals.find(g => g.id === goalId);
    if (goal && (!goal.category || ['Savings', 'Tích lũy', 'Tích luỹ'].includes(goal.category))) {
      setAutoAllocateSavings(false);
    }
  };

  const toggleCheck = (goalId: string) => {
    setAllocations(prev => prev.map(a => {
      if (a.goalId === goalId) {
        if (a.checked) {
          return { ...a, checked: false, amount: 0, percentage: 0, reason: 'Bỏ chọn' };
        } else {
          return { ...a, checked: true, reason: 'Đã chọn' };
        }
      }
      return a;
    }));
    const goal = goals.find(g => g.id === goalId);
    if (goal && (!goal.category || goal.category === 'Savings')) {
      setAutoAllocateSavings(false);
    }
  };

  // Tính toán số tiền đã phân bổ bởi người dùng (hoặc AI salary) cho các quỹ KHÔNG auto
  const manualAllocated = allocations.reduce((sum, a) => {
    const goal = goals.find(g => g.id === a.goalId);
    const isAutoSavings = autoAllocateSavings && goal && (!goal.category || goal.category === 'Savings');
    return isAutoSavings ? sum : sum + a.amount;
  }, 0);
  
  const autoRemaining = incomeAmount - manualAllocated;

  // Áp dụng Auto Savings Distribution
  const displayAllocations = allocations.map(a => {
    const goal = goals.find(g => g.id === a.goalId);
    if (autoAllocateSavings && goal && (!goal.category || goal.category === 'Savings')) {
      // Logic dồn tiền dư vào quỹ tích luỹ ưu tiên cao nhất
      const savingsGoals = goals.filter(g => !g.category || g.category === 'Savings').sort((x, y) => (x.priority || 1) - (y.priority || 1));
      const topPrioritySavings = savingsGoals.length > 0 ? savingsGoals[0] : null;
      if (topPrioritySavings && goal.id === topPrioritySavings.id) {
        return {
          ...a,
          amount: autoRemaining > 0 ? autoRemaining : 0,
          percentage: autoRemaining > 0 ? Number(((autoRemaining / incomeAmount) * 100).toFixed(1)) : 0,
          checked: autoRemaining > 0,
          reason: 'Tự động dồn tiền dư'
        };
      } else {
        return { ...a, amount: 0, percentage: 0, checked: false, reason: 'Chờ dồn tiền' };
      }
    }
    return a;
  });

  const totalAllocated = displayAllocations.reduce((sum, a) => sum + a.amount, 0);
  const totalPercentage = displayAllocations.reduce((sum, a) => sum + a.percentage, 0);
  const remaining = incomeAmount - totalAllocated;

  const handleSubmit = async () => {
    if (totalAllocated > incomeAmount) {
      alert("Lỗi: Tổng số tiền phân bổ không được vượt quá số tiền thu nhập!");
      return;
    }

    setIsSubmitting(true);
    for (const alloc of displayAllocations) {
      if (alloc.checked && alloc.amount > 0) {
        const targetGoal = goals.find(g => g.id === alloc.goalId);
        const isPersonal = (targetGoal as any)?.Privacy_Tag === 'PERSONAL';

        // Create transaction
        await useFinanceStore.getState().createTransaction({
          Transaction_Date: new Date().toISOString(),
          Transaction_Type: isPersonal ? 'EXPENSE' : 'GOAL_ALLOCATION',
          Amount_Original: alloc.amount,
          Amount_VND: alloc.amount,
          Currency: 'VND',
          Exchange_Rate: 1,
          Goal_From: '',
          Goal_To: alloc.goalId,
          Description: `Phân bổ thu nhập: ${incomeCategory || 'Khác'} - ${targetGoal?.name || ''}`,
          Owner_User_ID: useFinanceStore.getState().currentUser?.User_ID || '',
          Privacy_Tag: 'FAMILY',
          Status: 'POSTED',
          Category_ID: isPersonal ? 'Chi tiêu cá nhân' : 'Ngân sách',
          Account_From: '',
          Account_To: ''
        });

        if (targetGoal) {
          await useFinanceStore.getState().updateGoal(alloc.goalId, { Current_Amount: targetGoal.currentAmount + alloc.amount });
        }
      }
    }
    
    // Refresh goals
    await useFinanceStore.getState().fetchGoals();

    setIsSubmitting(false);
    onClose();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X size={24} />
        </button>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            {isSalary ? (
              <><Zap className="text-yellow-500" fill="currentColor" /> AI Phân bổ Lương (50/30/20)</>
            ) : (
              <><HandCoins className="text-blue-500" /> Phân bổ Thu nhập khác</>
            )}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {isSalary 
              ? "Hệ thống tự động gợi ý trích 50% vào quỹ Thiết Yếu, 30% quỹ Linh Hoạt, và 20% vào quỹ Tích Lũy dựa trên ưu tiên. Bạn có thể tự do điều chỉnh hoặc bỏ chọn."
              : "Đây là khoản thu ngoài lương. Bạn có thể tích chọn quỹ và tự nhập số tiền muốn phân bổ."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 p-4 rounded-lg mb-6 border border-green-200">
            <div className="text-sm text-green-800 mb-1">Tổng thu nhập</div>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(incomeAmount)}</div>
            <div className="text-xs text-green-700 font-medium mt-1">Phân loại: {incomeCategory || 'Không rõ'}</div>
          </div>

          {goals.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Chưa có quỹ nào. Hãy vào tab "Mục tiêu & Quỹ" để tạo quỹ Thiết yếu / Linh hoạt / Tích lũy.
            </div>
          ) : (
            <div className="space-y-4">
              {goals.slice().sort((a,b) => {
                const order = { 'Needs': 1, 'Wants': 2, 'Savings': 3 };
                const catA = a.category || 'Savings';
                const catB = b.category || 'Savings';
                if (order[catA as keyof typeof order] !== order[catB as keyof typeof order]) return order[catA as keyof typeof order] - order[catB as keyof typeof order];
                return (a.priority || 1) - (b.priority || 1);
              }).map(goal => {
                const alloc = displayAllocations.find(a => a.goalId === goal.id);
                if (!alloc) return null;
                
                const isAutoSavingsTarget = autoAllocateSavings && (!goal.category || goal.category === 'Savings');

                // Cảnh báo nếu trả thiếu nợ tối thiểu ở nhóm Savings
                const monthlyPayment = calculateMonthlyPayment(goal);
                const isUnderpaid = (goal.category === 'Savings' || !goal.category) && monthlyPayment > 0 && alloc.amount < monthlyPayment;

                return (
                  <div key={goal.id} className={`border p-3 rounded-lg space-y-2 ${alloc.checked ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={alloc.checked} 
                          onChange={() => toggleCheck(goal.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <div className="font-semibold text-gray-800">
                          {goal.name} 
                          <span className="text-[10px] uppercase font-bold text-gray-500 ml-2 tracking-wider">
                            {goal.category === 'Needs' ? 'Thiết yếu' : goal.category === 'Wants' ? 'Linh hoạt' : 'Tích lũy'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded uppercase tracking-wide">
                        {alloc.reason}
                      </div>
                    </div>
                    
                    {alloc.checked && (
                      <div className="flex gap-4 mt-2">
                        <div className="w-1/3">
                          <label className="block text-xs text-gray-500 mb-1">Tỷ lệ (%)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full p-2 border rounded text-right pr-6" 
                              value={alloc.percentage} 
                              onChange={(e) => handlePercentageChange(goal.id, Number(e.target.value))} 
                            />
                            <span className="absolute right-2 top-2 text-gray-400">%</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Số tiền phân bổ (VNĐ)</label>
                          <input 
                            type="number" 
                            className={`w-full p-2 border rounded font-semibold ${isUnderpaid ? 'text-red-600 border-red-300 bg-red-50' : 'text-blue-700'} ${isAutoSavingsTarget ? 'bg-gray-100' : ''}`}
                            value={alloc.amount} 
                            onChange={(e) => handleAmountChange(goal.id, Number(e.target.value))} 
                          />
                          {isUnderpaid && (
                            <div className="text-[10px] text-red-600 mt-1">⚠ Cần trả tối thiểu: {formatCurrency(monthlyPayment)} /tháng</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mt-6 pt-4 border-t bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Tổng % phân bổ:</span>
                  <span className={totalPercentage > 100 ? 'text-red-600 font-bold' : 'font-semibold'}>{totalPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Đã phân bổ vào các Quỹ:</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(totalAllocated)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 mt-2 border-t border-gray-200">
                  <span className="text-gray-700">Tiền dư (Chưa phân bổ):</span>
                  <span className={remaining < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(remaining)}</span>
                </div>
                
                {!isSalary && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-green-50 rounded-lg border border-green-200">
                      <input 
                        type="checkbox" 
                        checked={autoAllocateSavings} 
                        onChange={(e) => setAutoAllocateSavings(e.target.checked)}
                        className="w-5 h-5 text-green-600 rounded"
                      />
                      <span className="text-sm font-semibold text-green-800">
                        Tự động dồn toàn bộ tiền dư vào Quỹ Tích Lũy
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={onClose} className="flex-1 py-3 text-gray-700 bg-gray-100 rounded-lg font-bold hover:bg-gray-200">
                  Bỏ qua
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || totalAllocated > incomeAmount}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Phân bổ'}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
