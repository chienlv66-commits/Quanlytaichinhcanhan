"use client";

import React, { useMemo } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { User, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import ManualTransactionModal from '../input/ManualTransactionModal';

export default function PersonalDashboard() {
  const { goals, transactions, currentUser } = useFinanceStore();
  const [showManualModal, setShowManualModal] = React.useState(false);

  // Lấy các Quỹ cá nhân của người dùng hiện tại
  const personalGoals = useMemo(() => {
    return goals.filter(g => (g as any).Privacy_Tag === 'PERSONAL');
  }, [goals]);

  const totalPersonalBalance = personalGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Lấy các Giao dịch cá nhân của người dùng hiện tại
  const personalTransactions = useMemo(() => {
    if (!currentUser) return [];
    return transactions
      .filter(tx => tx.Privacy_Tag === 'PERSONAL' && tx.Owner_User_ID === currentUser.User_ID)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, currentUser]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Chi tiêu Cá nhân Riêng tư</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="text-white/80 text-sm font-normal">Tổng Quỹ Cá Nhân</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              {formatCurrency(totalPersonalBalance)}
            </div>
            <div className="text-sm text-blue-100 mb-6">
              Khoản tiền này đã được tính là chi phí chung của gia đình, bạn có thể tự do chi tiêu.
            </div>
            <button 
              onClick={() => setShowManualModal(true)}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full flex justify-center items-center gap-2"
            >
              <ArrowDownCircle size={18} /> Thêm Giao Dịch Cá Nhân
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chi tiết Quỹ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {personalGoals.length === 0 ? (
              <div className="text-gray-500 text-sm italic">
                Chưa có quỹ cá nhân nào. Hãy sang tab Mục tiêu để tạo quỹ với quyền riêng tư "Cá nhân".
              </div>
            ) : (
              personalGoals.map(g => (
                <div key={g.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="text-indigo-500" size={20} />
                    <span className="font-medium">{g.name}</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(g.currentAmount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lịch sử Giao Dịch Cá Nhân</CardTitle>
        </CardHeader>
        <CardContent>
          {personalTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có giao dịch cá nhân nào.
            </div>
          ) : (
            <div className="space-y-4">
              {personalTransactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${tx.type === 'Revenue' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.type === 'Revenue' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                    </div>
                    <div>
                      <div className="font-medium">{tx.category}</div>
                      <div className="text-sm text-gray-500">{tx.description}</div>
                    </div>
                  </div>
                  <div className={`font-bold ${tx.type === 'Revenue' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'Revenue' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showManualModal && <ManualTransactionModal onClose={() => setShowManualModal(false)} />}
    </div>
  );
}
