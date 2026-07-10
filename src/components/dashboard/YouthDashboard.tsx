"use client";

import React, { useState, useMemo } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { LogOut, Pizza, Book, Gamepad2, PenTool, CheckCircle } from 'lucide-react';

export default function YouthDashboard() {
  const { transactions, childBudgetWeekly, addManualTransaction, setUserRole } = useFinanceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Tính tổng chi tiêu tuần này của con
  const totalSpent = useMemo(() => {
    // Để đơn giản (trong MVP), giả định tất cả giao dịch do "Trẻ em" thực hiện (source = 'Youth App') đều tính vào Budget
    // Hoặc có thể lọc theo 7 ngày gần nhất.
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return transactions
      .filter(tx => tx.source === 'Youth App' && new Date(tx.timestamp) >= oneWeekAgo)
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
  }, [transactions]);

  const remaining = childBudgetWeekly - totalSpent;
  const progressPercent = Math.min((totalSpent / childBudgetWeekly) * 100, 100);

  const handleSpend = async (categoryTitle: string, amount: number, realCategory: string, type: 'COGS'|'OPEX') => {
    if (totalSpent + amount > childBudgetWeekly) {
      alert(`Vượt quá ngân sách tuần! Bạn chỉ còn ${remaining.toLocaleString('vi-VN')} đ`);
      return;
    }

    setIsSubmitting(true);
    await addManualTransaction({
      type,
      category: realCategory,
      amount: -amount,
      description: `Bé tiêu: ${categoryTitle}`,
      source: 'Youth App',
    });
    setIsSubmitting(false);
    setSuccessMsg(`Đã ghi nhận chi ${amount.toLocaleString('vi-VN')} đ`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-indigo-50 p-4 pb-24">
      <div className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-bold text-indigo-900">Ví Của Bé 🐷</h1>
        <button onClick={() => setUserRole(null)} className="text-gray-500 p-2 bg-white rounded-full shadow">
          <LogOut size={20} />
        </button>
      </div>

      <Card className="mb-6 shadow-lg border-0 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <CardContent className="pt-6">
          <div className="text-indigo-100 text-sm mb-1">Ngân sách tuần này còn lại</div>
          <div className="text-4xl font-bold mb-4">{Math.max(0, remaining).toLocaleString('vi-VN')} đ</div>
          
          <div className="w-full bg-indigo-900/30 rounded-full h-3 mb-2 overflow-hidden">
            <div 
              className={`h-3 rounded-full ${progressPercent > 80 ? 'bg-red-400' : 'bg-green-400'}`} 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="text-xs text-indigo-100 text-right">Đã tiêu {totalSpent.toLocaleString('vi-VN')} / {childBudgetWeekly.toLocaleString('vi-VN')} đ</div>
        </CardContent>
      </Card>

      {successMsg && (
        <div className="mb-6 bg-green-100 border border-green-300 text-green-800 p-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="text-green-600" size={20} />
          {successMsg}
        </div>
      )}

      <h2 className="font-bold text-gray-700 mb-4 px-1">Ghi chép nhanh</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => handleSpend('Đồ ăn vặt', 20000, 'Sinh hoạt cơ bản (Direct Materials)', 'COGS')}
          disabled={isSubmitting}
          className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-indigo-200 active:bg-indigo-50 flex flex-col items-center gap-3 transition-all"
        >
          <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center"><Pizza size={28}/></div>
          <div className="font-semibold text-gray-800">Đồ ăn vặt</div>
          <div className="text-sm text-gray-500">-20k</div>
        </button>

        <button 
          onClick={() => handleSpend('Dụng cụ học tập', 50000, 'Sinh hoạt cơ bản (Direct Materials)', 'COGS')}
          disabled={isSubmitting}
          className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-indigo-200 active:bg-indigo-50 flex flex-col items-center gap-3 transition-all"
        >
          <div className="w-14 h-14 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center"><PenTool size={28}/></div>
          <div className="font-semibold text-gray-800">Dụng cụ học</div>
          <div className="text-sm text-gray-500">-50k</div>
        </button>

        <button 
          onClick={() => handleSpend('Sách truyện', 100000, 'Học tập & PT bản thân (R&D)', 'OPEX')}
          disabled={isSubmitting}
          className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-indigo-200 active:bg-indigo-50 flex flex-col items-center gap-3 transition-all"
        >
          <div className="w-14 h-14 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center"><Book size={28}/></div>
          <div className="font-semibold text-gray-800">Sách truyện</div>
          <div className="text-sm text-gray-500">-100k</div>
        </button>

        <button 
          onClick={() => handleSpend('Giải trí / Đồ chơi', 150000, 'Ngoại giao & Giải trí (Sales & Marketing)', 'OPEX')}
          disabled={isSubmitting}
          className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-indigo-200 active:bg-indigo-50 flex flex-col items-center gap-3 transition-all"
        >
          <div className="w-14 h-14 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center"><Gamepad2 size={28}/></div>
          <div className="font-semibold text-gray-800">Giải trí</div>
          <div className="text-sm text-gray-500">-150k</div>
        </button>
      </div>

    </div>
  );
}
