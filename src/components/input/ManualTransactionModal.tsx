"use client";

import React, { useState } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X } from 'lucide-react';
import IncomeAllocationModal from './IncomeAllocationModal';

const CATEGORIES = {
  'Revenue': ['Lương & Thu nhập cố định', 'Thưởng & Thu nhập ngoài', 'Kinh doanh / Đầu tư', 'Được biếu tặng / Lì xì'],
  'COGS': ['Thuê nhà & Tiện ích', 'Đi chợ & Siêu thị', 'Giáo dục & Học phí', 'Xăng xe & Di chuyển', 'Bảo hiểm & Y tế cơ bản', 'Trả góp / Nợ cố định', 'Khác (Thiết yếu)'],
  'OPEX': ['Ăn ngoài & Cafe', 'Mua sắm cá nhân', 'Giải trí & Du lịch', 'Chăm sóc sắc đẹp / Thể thao', 'Hiếu hỷ & Biếu tặng', 'Khác (Linh hoạt)'],
  'Non-Operating': ['Lãi tiết kiệm / Cổ tức', 'Chi phí lãi vay', 'Thuế', 'Khác']
};

export default function ManualTransactionModal({ onClose }: { onClose: () => void }) {
  const { addManualTransaction, exchangeRate } = useFinanceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<'Revenue' | 'COGS' | 'OPEX' | 'Non-Operating'>('COGS');
  const [category, setCategory] = useState(CATEGORIES['COGS'][0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'VND'|'USD'>('VND');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('Tiền mặt');

  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [savedIncomeAmount, setSavedIncomeAmount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    setIsSubmitting(true);
    let finalAmount = Number(amount);
    
    // Convert to VND if USD is selected
    const originalAmount = finalAmount;
    if (currency === 'USD') {
      finalAmount = finalAmount * exchangeRate;
    }

    if (type === 'COGS' || type === 'OPEX') {
      finalAmount = -Math.abs(finalAmount); // Đảm bảo chi phí là số âm
    } else if (type === 'Revenue') {
      finalAmount = Math.abs(finalAmount); // Đảm bảo doanh thu là số dương
    }
    // Đối với Non-Operating, tuỳ thuộc vào Category để quyết định âm dương.

    await addManualTransaction({
      type,
      category,
      amount: finalAmount,
      originalAmount: currency === 'USD' ? originalAmount : undefined,
      currency,
      description,
      source
    });
    
    setIsSubmitting(false);

    // Bật modal phân bổ nếu là Thu nhập
    if (type === 'Revenue') {
      setSavedIncomeAmount(finalAmount);
      setShowAllocationModal(true);
    } else {
      onClose();
    }
  };

  const handleTypeChange = (newType: any) => {
    setType(newType);
    setCategory(CATEGORIES[newType as keyof typeof CATEGORIES][0]);
  };

  if (showAllocationModal) {
    return <IncomeAllocationModal incomeAmount={savedIncomeAmount} incomeCategory={category} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X size={24} />
        </button>
        <CardHeader>
          <CardTitle>Thêm Giao Dịch Thủ Công</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-2">
              <label className={`border p-3 rounded-lg text-center cursor-pointer ${type === 'Revenue' ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'bg-gray-50'}`}>
                <input type="radio" className="hidden" checked={type === 'Revenue'} onChange={() => handleTypeChange('Revenue')} />
                Khoản Thu
              </label>
              <label className={`border p-3 rounded-lg text-center cursor-pointer ${['COGS', 'OPEX'].includes(type) ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50'}`}>
                <input type="radio" className="hidden" checked={['COGS', 'OPEX'].includes(type)} onChange={() => handleTypeChange('COGS')} />
                Khoản Chi
              </label>
            </div>

            {['COGS', 'OPEX'].includes(type) && (
              <div className="flex gap-2">
                <button type="button" className={`flex-1 py-1 text-sm rounded ${type === 'COGS' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => handleTypeChange('COGS')}>Chi thiết yếu</button>
                <button type="button" className={`flex-1 py-1 text-sm rounded ${type === 'OPEX' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => handleTypeChange('OPEX')}>Chi phong cách sống</button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Nhóm (Hạng mục)</label>
              <select className="w-full p-2 border rounded" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES[type].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Số tiền</label>
                <input type="number" required placeholder="Ví dụ: 500000" className="w-full p-2 border rounded" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium mb-1">Tiền tệ</label>
                <select className="w-full p-2 border rounded" value={currency} onChange={e => setCurrency(e.target.value as 'VND'|'USD')}>
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            
            {currency === 'USD' && (
              <div className="text-sm text-gray-500 italic">
                ≈ {(Number(amount) * exchangeRate).toLocaleString('vi-VN')} VND (Tỷ giá: {exchangeRate.toLocaleString('vi-VN')})
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Tài khoản/Nguồn (VD: Tiền mặt, VCB)</label>
              <input type="text" required className="w-full p-2 border rounded" value={source} onChange={e => setSource(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mô tả giao dịch</label>
              <input type="text" required placeholder="Mua thức ăn, đóng tiền học..." className="w-full p-2 border rounded" value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Đang lưu...' : 'Lưu Giao Dịch'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
