"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useFinanceStore, Transaction, Goal } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowDownIcon, ArrowUpIcon, Activity, Edit2, X, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function PnLDashboard() {
  const { transactions, fetchPnL, goals, fetchGoals, updateTransaction, deleteTransaction, saveGoals, error } = useFinanceStore();

  const [showTxDetails, setShowTxDetails] = useState<{title: string, categoryKeys: string[]} | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showReallocate, setShowReallocate] = useState(false);

  useEffect(() => {
    fetchPnL();
    fetchGoals();
  }, [fetchPnL, fetchGoals]);

  const { pnl, pnlSummary, budgetSummary } = useMemo(() => {
    const pnl = transactions.reduce((acc, tx) => {
      const amt = Number(tx.amount);
      
      // Thu nhập (Revenue)
      if (['Lương & Thu nhập cố định', 'Thưởng & Thu nhập ngoài', 'Kinh doanh / Đầu tư', 'Được biếu tặng / Lì xì', 'Tổng doanh thu (Gross Revenue)'].includes(tx.category) || tx.type === 'Revenue') acc.revenue += amt;
      
      // Thiết yếu (COGS)
      if (['Thuê nhà & Tiện ích', 'Đi chợ & Siêu thị', 'Giáo dục & Học phí', 'Xăng xe & Di chuyển', 'Bảo hiểm & Y tế cơ bản', 'Trả góp / Nợ cố định', 'Khác (Thiết yếu)', 'Thiết yếu (Ăn uống, Thuê nhà)', 'Giáo dục', 'Sức khỏe'].includes(tx.category)) {
        if (tx.category.includes('Đi chợ') || tx.category === 'Thiết yếu (Ăn uống, Thuê nhà)') acc.needs_groceries += amt;
        else if (tx.category.includes('Thuê nhà')) acc.needs_utilities += amt;
        else if (tx.category.includes('Giáo dục')) acc.needs_edu += amt;
        else acc.needs_other += amt;
      }
      
      // Linh hoạt (OPEX)
      if (['Ăn ngoài & Cafe', 'Mua sắm cá nhân', 'Giải trí & Du lịch', 'Chăm sóc sắc đẹp / Thể thao', 'Hiếu hỷ & Biếu tặng', 'Khác (Linh hoạt)', 'Linh hoạt (Giải trí, Mua sắm)', 'Chi tiêu cá nhân', 'Khác'].includes(tx.category) && !['Giáo dục', 'Sức khỏe', 'Thiết yếu (Ăn uống, Thuê nhà)'].includes(tx.category)) {
        if (tx.category.includes('Ăn ngoài')) acc.wants_dining += amt;
        else if (tx.category.includes('Mua sắm') || tx.category === 'Linh hoạt (Giải trí, Mua sắm)' || tx.category === 'Chi tiêu cá nhân') acc.wants_shopping += amt;
        else if (tx.category.includes('Giải trí')) acc.wants_entertainment += amt;
        else acc.wants_other += amt;
      }
      
      // Tích lũy / Đầu tư / Khác (Non-Operating)
      if (['Lãi tiết kiệm / Cổ tức', 'Chi phí lãi vay', 'Thuế', 'Khác'].includes(tx.category)) {
        acc.investments += amt;
      }

      return acc;
    }, {
      revenue: 0, 
      needs_groceries: 0, needs_utilities: 0, needs_edu: 0, needs_other: 0,
      wants_dining: 0, wants_shopping: 0, wants_entertainment: 0, wants_other: 0,
      investments: 0
    });

    const totalIncome = pnl.revenue;
    const totalNeeds = Math.abs(pnl.needs_groceries + pnl.needs_utilities + pnl.needs_edu + pnl.needs_other);
    const totalWants = Math.abs(pnl.wants_dining + pnl.wants_shopping + pnl.wants_entertainment + pnl.wants_other);
    
    // Ngân sách từ Goals (chỉ tính Quỹ Chung)
    const familyGoals = goals.filter(g => (g as any).Privacy_Tag !== 'PERSONAL');
    const budgetNeeds = familyGoals.filter(g => g.category === 'Needs').reduce((sum, g) => sum + g.currentAmount, 0);
    const budgetWants = familyGoals.filter(g => g.category === 'Wants').reduce((sum, g) => sum + g.currentAmount, 0);
    const budgetSavings = familyGoals.filter(g => g.category === 'Savings').reduce((sum, g) => sum + g.currentAmount, 0);
    const totalBudget = budgetNeeds + budgetWants + budgetSavings;

    const pnlSummary = { totalIncome, totalNeeds, totalWants };
    const budgetSummary = { budgetNeeds, budgetWants, budgetSavings, totalBudget };
    
    return { pnl, pnlSummary, budgetSummary };
  }, [transactions, goals]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const pieData = [
    { name: 'Thiết yếu (Needs)', value: budgetSummary.budgetNeeds, color: '#3b82f6' },
    { name: 'Linh hoạt (Wants)', value: budgetSummary.budgetWants, color: '#f59e0b' },
    { name: 'Tích lũy (Savings)', value: budgetSummary.budgetSavings, color: '#10b981' }
  ];

  // Tính tỷ lệ thực tế
  const actualRatioNeeds = budgetSummary.totalBudget > 0 ? (budgetSummary.budgetNeeds / budgetSummary.totalBudget) * 100 : 0;
  const actualRatioWants = budgetSummary.totalBudget > 0 ? (budgetSummary.budgetWants / budgetSummary.totalBudget) * 100 : 0;
  const actualRatioSavings = budgetSummary.totalBudget > 0 ? (budgetSummary.budgetSavings / budgetSummary.totalBudget) * 100 : 0;

  const handleDeleteTx = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      await deleteTransaction(id);
    }
  };

  const revenueKeys = ['Lương & Thu nhập cố định', 'Thưởng & Thu nhập ngoài', 'Kinh doanh / Đầu tư', 'Được biếu tặng / Lì xì', 'Tổng doanh thu (Gross Revenue)'];
  const needsKeys = ['Thuê nhà & Tiện ích', 'Đi chợ & Siêu thị', 'Giáo dục & Học phí', 'Xăng xe & Di chuyển', 'Bảo hiểm & Y tế cơ bản', 'Trả góp / Nợ cố định', 'Khác (Thiết yếu)'];
  const wantsKeys = ['Ăn ngoài & Cafe', 'Mua sắm cá nhân', 'Giải trí & Du lịch', 'Chăm sóc sắc đẹp / Thể thao', 'Hiếu hỷ & Biếu tặng', 'Khác (Linh hoạt)'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Báo cáo Dòng Tiền (50/30/20)</h2>
        <button 
          onClick={() => setShowReallocate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-colors"
        >
          <RefreshCw size={18} /> Điều chỉnh Ngân sách
        </button>
      </div>
      
      {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">Lỗi: {error}</div>}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div onClick={() => setShowTxDetails({ title: 'Chi tiết Thu nhập', categoryKeys: revenueKeys })} className="cursor-pointer">
          <MetricCard 
            title="Tổng Thu Nhập" 
            value={formatCurrency(pnlSummary.totalIncome)} 
            icon={<ArrowUpIcon className="h-4 w-4 text-green-500" />} 
          />
        </div>
        
        <div onClick={() => setShowTxDetails({ title: 'Chi tiết Thiết yếu', categoryKeys: needsKeys })} className="cursor-pointer">
          <BudgetCard 
            title="Thiết yếu (Needs)" 
            budget={budgetSummary.budgetNeeds} 
            spent={pnlSummary.totalNeeds}
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            colorClass="bg-blue-500"
          />
        </div>

        <div onClick={() => setShowTxDetails({ title: 'Chi tiết Linh hoạt', categoryKeys: wantsKeys })} className="cursor-pointer">
          <BudgetCard 
            title="Linh hoạt (Wants)" 
            budget={budgetSummary.budgetWants} 
            spent={pnlSummary.totalWants}
            icon={<Activity className="h-4 w-4 text-orange-500" />}
            colorClass="bg-orange-500"
          />
        </div>

        <div className="cursor-pointer">
          <BudgetCard 
            title="Tích lũy & Đầu tư" 
            budget={budgetSummary.budgetSavings} 
            spent={0} // Tích lũy không có "thực chi" trừ khi mua tài sản, nhưng để đơn giản ta hiển thị số dư quỹ
            icon={<ArrowDownIcon className="h-4 w-4 text-emerald-500" />}
            colorClass="bg-emerald-500"
            isSavings
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-1 shadow-sm">
          <CardHeader><CardTitle>Cơ cấu Ngân sách (Budget)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Thiết yếu (Mục tiêu 50%)</span>
                <span className={`font-bold ${Math.abs(actualRatioNeeds - 50) > 5 ? 'text-red-500' : 'text-green-500'}`}>{actualRatioNeeds.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Linh hoạt (Mục tiêu 30%)</span>
                <span className={`font-bold ${Math.abs(actualRatioWants - 30) > 5 ? 'text-red-500' : 'text-green-500'}`}>{actualRatioWants.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tích lũy (Mục tiêu 20%)</span>
                <span className={`font-bold ${Math.abs(actualRatioSavings - 20) > 5 ? 'text-red-500' : 'text-green-500'}`}>{actualRatioSavings.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      
        <div className="col-span-2 grid gap-4 md:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Đã chi Thiết yếu</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Đi chợ & Siêu thị</span><span className="font-medium">{formatCurrency(Math.abs(pnl.needs_groceries))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Điện, Nước, Internet</span><span className="font-medium">{formatCurrency(Math.abs(pnl.needs_utilities))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Giáo dục & Học phí</span><span className="font-medium">{formatCurrency(Math.abs(pnl.needs_edu))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Khác</span><span className="font-medium">{formatCurrency(Math.abs(pnl.needs_other))}</span></div>
              <div className="flex justify-between py-2 border-t font-bold text-base mt-2"><span className="text-gray-800">Tổng Đã chi</span><span className="text-blue-600">{formatCurrency(pnlSummary.totalNeeds)}</span></div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader><CardTitle>Đã chi Linh hoạt</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Ăn ngoài & Cafe</span><span className="font-medium">{formatCurrency(Math.abs(pnl.wants_dining))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Mua sắm cá nhân</span><span className="font-medium">{formatCurrency(Math.abs(pnl.wants_shopping))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Giải trí & Du lịch</span><span className="font-medium">{formatCurrency(Math.abs(pnl.wants_entertainment))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Khác</span><span className="font-medium">{formatCurrency(Math.abs(pnl.wants_other))}</span></div>
              <div className="flex justify-between py-2 border-t font-bold text-base mt-2"><span className="text-gray-800">Tổng Đã chi</span><span className="text-orange-600">{formatCurrency(pnlSummary.totalWants)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Giao dịch gần đây</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-gray-500 text-sm">Chưa có giao dịch nào được ghi nhận.</div>
          ) : (
            <div className="space-y-3">
              {transactions.slice().reverse().slice(0, 15).map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all group">
                  <div>
                    <div className="font-semibold text-gray-800">{tx.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{tx.category} • {new Date(tx.timestamp).toLocaleString('vi-VN')}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    {(() => {
                      const rawAmt = Number(tx.amount);
                      const isIncome = tx.Transaction_Type === 'INCOME' || tx.type === 'Revenue';
                      const isTransfer = tx.Transaction_Type === 'TRANSFER' || tx.Transaction_Type === 'GOAL_ALLOCATION';
                      
                      let colorClass = isIncome ? 'text-green-600' : 'text-red-600';
                      let sign = isIncome ? '+' : '-';
                      
                      if (isTransfer) {
                        colorClass = 'text-gray-600';
                        sign = '';
                      }

                      return (
                        <div className={`font-bold ${colorClass}`}>
                          {sign}{formatCurrency(Math.abs(rawAmt))}
                        </div>
                      );
                    })()}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button onClick={() => setEditingTx(tx)} className="text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteTx(tx.id)} className="text-gray-400 hover:text-red-600"><X size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showTxDetails && (
        <TransactionDetailsModal 
          title={showTxDetails.title} 
          transactions={transactions.filter(t => showTxDetails.categoryKeys.includes(t.category) || (showTxDetails.title === 'Chi tiết Thu nhập' && t.type === 'Revenue'))}
          onClose={() => setShowTxDetails(null)} 
        />
      )}

      {editingTx && (
        <TransactionEditModal 
          transaction={editingTx} 
          onSave={async (updates) => {
            const apiUpdates: any = {};
            if (updates.description !== undefined) apiUpdates.Description = updates.description;
            if (updates.amount !== undefined) {
              apiUpdates.Amount_Original = Math.abs(updates.amount);
              apiUpdates.Amount_VND = Math.abs(updates.amount);
            }
            if (updates.category !== undefined) apiUpdates.Category_ID = updates.category;
            if (updates.timestamp !== undefined) apiUpdates.Transaction_Date = updates.timestamp;

            await updateTransaction(editingTx.id, apiUpdates);
            setEditingTx(null);
            // Optionally refetch
            await useFinanceStore.getState().fetchTransactions();
          }}
          onClose={() => setEditingTx(null)} 
        />
      )}

      {showReallocate && (
        <ReallocateModal goals={goals} saveGoals={saveGoals} onClose={() => setShowReallocate(false)} />
      )}
    </div>
  );
}

// --- Sub Components ---

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className="text-xs text-blue-500 mt-2 font-medium cursor-pointer">Bấm để xem chi tiết →</p>
      </CardContent>
    </Card>
  );
}

function BudgetCard({ title, budget, spent, icon, colorClass, isSavings = false }: { title: string, budget: number, spent: number, icon: React.ReactNode, colorClass: string, isSavings?: boolean }) {
  const remaining = budget - spent;
  const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + 'đ';

  return (
    <Card className="hover:shadow-md transition-shadow relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${colorClass} opacity-50`}></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold text-gray-700">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(budget)}</div>
        {!isSavings ? (
          <>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 mt-3">
              <div className={`${colorClass} h-1.5 rounded-full`} style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Đã chi: <strong>{formatCurrency(spent)}</strong></span>
              <span>Còn lại: <strong className={remaining < 0 ? 'text-red-500' : ''}>{formatCurrency(remaining)}</strong></span>
            </div>
            <p className="text-xs text-blue-500 mt-2 font-medium cursor-pointer">Bấm để xem chi tiết chi tiêu →</p>
          </>
        ) : (
          <p className="text-xs text-gray-500 mt-2">Tổng số dư trong các quỹ tích lũy</p>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionDetailsModal({ title, transactions, onClose }: { title: string, transactions: Transaction[], onClose: () => void }) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[80vh] flex flex-col">
        <CardHeader className="flex flex-row justify-between items-center border-b pb-4">
          <CardTitle>{title}</CardTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800"><X size={20} /></button>
        </CardHeader>
        <CardContent className="overflow-y-auto p-4 flex-1">
          {transactions.length === 0 ? <p className="text-gray-500 text-center py-8">Không có giao dịch nào.</p> : (
            <div className="space-y-3">
              {transactions.slice().reverse().map(tx => (
                <div key={tx.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{tx.description}</div>
                    <div className="text-xs text-gray-500">{tx.category} • {new Date(tx.timestamp).toLocaleString('vi-VN')}</div>
                  </div>
                  <div className={`font-bold ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-gray-800'}`}>
                    {Number(tx.amount) > 0 ? '+' : ''}{formatCurrency(Number(tx.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionEditModal({ transaction, onSave, onClose }: { transaction: Transaction, onSave: (u: Partial<Transaction>) => void, onClose: () => void }) {
  const [desc, setDesc] = useState(transaction.description);
  const [amount, setAmount] = useState(Math.abs(transaction.amount).toString());
  const [cat, setCat] = useState(transaction.category);
  const [txDate, setTxDate] = useState(() => {
    if (transaction.timestamp) {
      const d = new Date(transaction.timestamp);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = transaction.amount > 0 ? Number(amount) : -Number(amount);
    let txDateISO = new Date().toISOString();
    if (txDate) {
      txDateISO = new Date(txDate).toISOString();
    }
    onSave({ description: desc, amount: finalAmount, category: cat, timestamp: txDateISO });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="flex flex-row justify-between items-center border-b pb-3">
          <CardTitle>Sửa Giao Dịch</CardTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800"><X size={20} /></button>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Thời gian giao dịch</label>
              <input type="datetime-local" className="w-full p-2 border rounded" value={txDate} onChange={e => setTxDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <input type="text" className="w-full p-2 border rounded" value={desc} onChange={e => setDesc(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số tiền</label>
              <input type="number" className="w-full p-2 border rounded" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Danh mục</label>
              <input type="text" className="w-full p-2 border rounded bg-gray-50" value={cat} onChange={e => setCat(e.target.value)} />
            </div>
            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold">Lưu thay đổi</button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ReallocateModal({ goals, saveGoals, onClose }: { goals: Goal[], saveGoals: (g: Goal[]) => void, onClose: () => void }) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId || !amount) return;

    const amt = Number(amount);
    
    // Create GOAL_ALLOCATION transaction
    await useFinanceStore.getState().createTransaction({
      Transaction_Date: new Date().toISOString(),
      Transaction_Type: 'GOAL_ALLOCATION',
      Amount_Original: amt,
      Amount_VND: amt,
      Currency: 'VND',
      Exchange_Rate: 1,
      Goal_From: fromId,
      Goal_To: toId,
      Description: `Điều chuyển ngân sách`,
      Owner_User_ID: useFinanceStore.getState().currentUser?.User_ID || '',
      Privacy_Tag: 'FAMILY',
      Status: 'POSTED',
      Category_ID: 'Ngân sách',
      Account_From: '',
      Account_To: ''
    });

    const fromGoal = goals.find(g => g.id === fromId);
    const toGoal = goals.find(g => g.id === toId);
    
    if (fromGoal) {
      await useFinanceStore.getState().updateGoal(fromId, { Current_Amount: fromGoal.currentAmount - amt });
    }
    if (toGoal) {
      await useFinanceStore.getState().updateGoal(toId, { Current_Amount: toGoal.currentAmount + amt });
    }

    // Refresh goals
    await useFinanceStore.getState().fetchGoals();

    onClose();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + 'đ';

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="flex flex-row justify-between items-center border-b pb-3">
          <CardTitle>Điều chỉnh Phân bổ (Chuyển tiền)</CardTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800"><X size={20} /></button>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleTransfer} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lấy từ Quỹ:</label>
              <select className="w-full p-2 border rounded" value={fromId} onChange={e => setFromId(e.target.value)} required>
                <option value="">-- Chọn quỹ nguồn --</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.name} (Dư: {formatCurrency(g.currentAmount)})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chuyển sang Quỹ:</label>
              <select className="w-full p-2 border rounded" value={toId} onChange={e => setToId(e.target.value)} required>
                <option value="">-- Chọn quỹ đích --</option>
                {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số tiền chuyển (VNĐ)</label>
              <input type="number" className="w-full p-2 border rounded" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Chuyển ngay</button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
