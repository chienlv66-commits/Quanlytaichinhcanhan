"use client";

import React, { useEffect, useState } from 'react';
import { useFinanceStore, Investment, InvestmentCashflow } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, Plus, ArrowUpRight, ArrowDownRight, DollarSign, Edit2, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function InvestmentDashboard() {
  const { investments, fetchInvestments, saveInvestments } = useFinanceStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const handleSaveInvestment = async (inv: Investment) => {
    const isEdit = investments.some(i => i.id === inv.id);
    let newList;
    if (isEdit) {
      newList = investments.map(i => i.id === inv.id ? inv : i);
    } else {
      newList = [...investments, inv];
    }
    await saveInvestments(newList);
    setShowAddModal(false);
  };

  const handleAddCashflow = async (inv: Investment, cashflow: InvestmentCashflow) => {
    const updatedInv = { ...inv, cashflows: [...inv.cashflows, cashflow] };
    if (cashflow.type === 'IN') {
      updatedInv.currentAmount += cashflow.amount;
    } else {
      updatedInv.currentAmount -= cashflow.amount;
    }
    const newList = investments.map(i => i.id === inv.id ? updatedInv : i);
    await saveInvestments(newList);
    setSelectedInvestment(null);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Quản lý Đầu tư & Tích lũy</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus size={20} /> Thêm Danh mục
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {investments.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>Chưa có danh mục đầu tư nào.</p>
            <p className="text-sm mt-1">Hãy tạo một danh mục để bắt đầu theo dõi tỷ suất sinh lời thực tế so với kỳ vọng.</p>
          </div>
        ) : (
          investments.map(inv => {
            const totalInflow = inv.cashflows.filter(c => c.type === 'IN').reduce((sum, c) => sum + c.amount, 0);
            const totalOutflow = inv.cashflows.filter(c => c.type === 'OUT').reduce((sum, c) => sum + c.amount, 0);
            const netInvestment = totalInflow - totalOutflow;
            const profit = inv.currentAmount - netInvestment;
            const actualYield = netInvestment > 0 ? (profit / netInvestment) * 100 : 0;

            return (
              <Card key={inv.id} className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedInvestment(inv)}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{inv.name}</CardTitle>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded mt-1 inline-block font-medium">
                        {inv.type === 'Short' ? 'Ngắn hạn' : inv.type === 'Mid' ? 'Trung hạn' : 'Dài hạn'}
                      </span>
                    </div>
                    <Edit2 size={16} className="text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mt-4 space-y-3">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <div className="text-xs text-blue-800 mb-1 font-semibold">Giá trị hiện tại</div>
                      <div className="text-xl font-bold text-blue-900">{formatCurrency(inv.currentAmount)}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="border rounded p-2 text-center bg-gray-50">
                        <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Lãi Kỳ vọng</div>
                        <div className="font-semibold text-gray-700">{inv.expectedYield}% / năm</div>
                      </div>
                      <div className={`border rounded p-2 text-center ${actualYield >= inv.expectedYield ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">ROI Thực tế</div>
                        <div className={`font-bold ${actualYield >= inv.expectedYield ? 'text-green-600' : 'text-orange-600'}`}>
                          {actualYield.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 pt-3 border-t">
                      <span>Vốn ròng: {formatCurrency(netInvestment)}</span>
                      <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {showAddModal && <InvestmentSetupModal onClose={() => setShowAddModal(false)} onSave={handleSaveInvestment} />}
      {selectedInvestment && <CashflowModal investment={selectedInvestment} onClose={() => setSelectedInvestment(null)} onSave={handleAddCashflow} />}
    </div>
  );
}

function InvestmentSetupModal({ onClose, onSave }: { onClose: () => void, onSave: (inv: Investment) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Investment['type']>('Short');
  const [expectedYield, setExpectedYield] = useState('');
  const [initialAmount, setInitialAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(initialAmount) || 0;
    const inv: Investment = {
      id: Date.now().toString(),
      name,
      type,
      expectedYield: Number(expectedYield),
      currentAmount: amount,
      cashflows: amount > 0 ? [{ id: Date.now().toString(), date: new Date().toISOString(), amount, type: 'IN', description: 'Vốn ban đầu' }] : []
    };
    onSave(inv);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900">
          <X size={24} />
        </button>
        <CardHeader><CardTitle>Tạo Danh mục Đầu tư</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên danh mục (VD: Chứng khoán SSI)</label>
              <input type="text" required className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chiến lược / Thời hạn</label>
              <select className="w-full p-2 border rounded" value={type} onChange={e => setType(e.target.value as Investment['type'])}>
                <option value="Short">Ngắn hạn (&lt; 1 năm)</option>
                <option value="Mid">Trung hạn (1-3 năm)</option>
                <option value="Long">Dài hạn (&gt; 3 năm)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lợi nhuận kỳ vọng (%/năm)</label>
              <input type="number" step="0.1" required className="w-full p-2 border rounded" value={expectedYield} onChange={e => setExpectedYield(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số vốn ban đầu (VNĐ)</label>
              <input type="number" placeholder="VD: 50000000" className="w-full p-2 border rounded" value={initialAmount} onChange={e => setInitialAmount(e.target.value)} />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Lưu Danh Mục</button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CashflowModal({ investment, onClose, onSave }: { investment: Investment, onClose: () => void, onSave: (inv: Investment, c: InvestmentCashflow) => void }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [desc, setDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(investment, {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount: Number(amount),
      type,
      description: desc
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 font-bold">X</button>
        <CardHeader>
          <CardTitle className="text-lg">Dòng tiền: {investment.name}</CardTitle>
          <p className="text-xs text-gray-500">Ghi nhận Mua/Bán hoặc nạp/rút để hệ thống tính toán lợi nhuận thực tế.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 bg-gray-50 p-3 rounded text-sm border">
            Giá trị hiện tại ước tính: <span className="font-bold text-blue-600 text-lg ml-2">{new Intl.NumberFormat('vi-VN').format(investment.currentAmount)} đ</span>
            <div className="text-xs text-gray-400 mt-1">* Hệ thống tự cộng trừ khi bạn ghi nhận dòng tiền.</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <button type="button" onClick={() => setType('IN')} className={`flex-1 p-2 rounded border text-sm ${type === 'IN' ? 'bg-green-50 border-green-500 text-green-700 font-bold' : ''}`}>+ Nạp tiền (Mua)</button>
              <button type="button" onClick={() => setType('OUT')} className={`flex-1 p-2 rounded border text-sm ${type === 'OUT' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : ''}`}>- Rút tiền (Bán)</button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Số tiền giao dịch</label>
              <input type="number" required className="w-full p-2 border rounded font-semibold text-lg" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ghi chú (Tùy chọn)</label>
              <input type="text" className="w-full p-2 border rounded" placeholder="Mua thêm 1000 cổ phiếu..." value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Lưu Giao Dịch</button>
          </form>

          {investment.cashflows.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-xs text-gray-500 uppercase font-bold mb-2">Lịch sử giao dịch</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto text-sm bg-gray-50 p-2 rounded">
                {investment.cashflows.slice().reverse().map(c => (
                  <div key={c.id} className="flex justify-between items-center border-b border-gray-200 pb-1 last:border-0">
                    <div>
                      <span className={c.type === 'IN' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{c.type === 'IN' ? '+' : '-'}</span>
                      <span className="ml-2 text-gray-700 text-xs">{c.description || 'Giao dịch'}</span>
                      <div className="text-[10px] text-gray-400 ml-4">{new Date(c.date).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <div className="font-semibold">{new Intl.NumberFormat('vi-VN').format(c.amount)} đ</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
