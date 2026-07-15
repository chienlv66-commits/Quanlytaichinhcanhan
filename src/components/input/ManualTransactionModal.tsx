"use client";

import React, { useState } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { X } from 'lucide-react';
import IncomeAllocationModal from './IncomeAllocationModal';

const CATEGORIES: Record<string, string[]> = {
  'INCOME': ['Lương & Thu nhập cố định', 'Thưởng & Thu nhập ngoài', 'Kinh doanh / Đầu tư', 'Được biếu tặng / Lì xì'],
  'EXPENSE': ['Thiết yếu (Ăn uống, Thuê nhà)', 'Linh hoạt (Giải trí, Mua sắm)', 'Chi tiêu cá nhân', 'Giáo dục', 'Sức khỏe', 'Khác', 'Mỹ phẩm / Làm đẹp', 'Thời trang / Phụ kiện', 'Giao lưu / Bạn bè', 'Sở thích cá nhân'],
  'TRANSFER': ['Chuyển tiền nội bộ']
};

export default function ManualTransactionModal({ onClose }: { onClose: () => void }) {
  const { createTransaction, accounts, goals, updateGoal } = useFinanceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [category, setCategory] = useState(CATEGORIES['EXPENSE'][0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  const [accountFrom, setAccountFrom] = useState(accounts.length > 0 ? accounts[0].Account_ID : '');
  const [accountTo, setAccountTo] = useState('');
  const [goalId, setGoalId] = useState('');
  const [privacyTag, setPrivacyTag] = useState<'FAMILY' | 'PERSONAL' | 'BUSINESS'>('FAMILY');

  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [savedIncomeAmount, setSavedIncomeAmount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    setIsSubmitting(true);
    let finalAmount = Number(amount);

    const success = await createTransaction({
      Transaction_Type: type,
      Category_ID: category,
      Amount_Original: finalAmount,
      Amount_VND: finalAmount, // For simplicity in Phase 1
      Currency: 'VND',
      Description: description,
      Account_From: accountFrom,
      Account_To: type === 'TRANSFER' ? accountTo : '',
      Goal_From: type === 'EXPENSE' ? goalId : '',
      Goal_To: type === 'INCOME' ? goalId : '',
      Privacy_Tag: privacyTag
    });
    
    if (success && goalId) {
      const targetGoal = goals.find(g => g.id === goalId || g.Goal_ID === goalId);
      if (targetGoal) {
        const amountDiff = type === 'INCOME' ? finalAmount : (type === 'EXPENSE' ? -finalAmount : 0);
        if (amountDiff !== 0) {
          await updateGoal(targetGoal.id, { Current_Amount: targetGoal.currentAmount + amountDiff });
        }
      }
    }
    
    setIsSubmitting(false);

    if (success) {
      if (type === 'INCOME') {
        setSavedIncomeAmount(finalAmount);
        setShowAllocationModal(true);
      } else {
        onClose();
      }
    }
  };

  const handleTypeChange = (newType: 'INCOME' | 'EXPENSE' | 'TRANSFER') => {
    setType(newType);
    setCategory(CATEGORIES[newType][0]);
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
            
            <div className="grid grid-cols-3 gap-2">
              <label className={`border p-2 rounded-lg text-center cursor-pointer text-sm ${type === 'INCOME' ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'bg-gray-50'}`}>
                <input type="radio" className="hidden" checked={type === 'INCOME'} onChange={() => handleTypeChange('INCOME')} />
                Thu nhập
              </label>
              <label className={`border p-2 rounded-lg text-center cursor-pointer text-sm ${type === 'EXPENSE' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50'}`}>
                <input type="radio" className="hidden" checked={type === 'EXPENSE'} onChange={() => handleTypeChange('EXPENSE')} />
                Chi phí
              </label>
              <label className={`border p-2 rounded-lg text-center cursor-pointer text-sm ${type === 'TRANSFER' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-gray-50'}`}>
                <input type="radio" className="hidden" checked={type === 'TRANSFER'} onChange={() => handleTypeChange('TRANSFER')} />
                Chuyển khoản
              </label>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Số tiền (VND)</label>
                <input type="number" required placeholder="Ví dụ: 500000" className="w-full p-2 border rounded" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {type === 'TRANSFER' ? 'Từ tài khoản' : 'Tài khoản (Nguồn/Đích)'}
              </label>
              <select className="w-full p-2 border rounded" value={accountFrom} onChange={e => setAccountFrom(e.target.value)} required>
                <option value="">-- Chọn tài khoản --</option>
                {accounts.map(a => (
                  <option key={a.Account_ID} value={a.Account_ID}>{a.Account_Name}</option>
                ))}
              </select>
            </div>

            {type === 'TRANSFER' && (
              <div>
                <label className="block text-sm font-medium mb-1">Đến tài khoản</label>
                <select className="w-full p-2 border rounded" value={accountTo} onChange={e => setAccountTo(e.target.value)} required>
                  <option value="">-- Chọn tài khoản --</option>
                  {accounts.map(a => (
                    <option key={a.Account_ID} value={a.Account_ID}>{a.Account_Name}</option>
                  ))}
                </select>
              </div>
            )}

            {type !== 'TRANSFER' && (
              <div>
                <label className="block text-sm font-medium mb-1">Nhóm (Hạng mục)</label>
                <select className="w-full p-2 border rounded" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES[type].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {type !== 'TRANSFER' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {type === 'INCOME' ? 'Cộng vào Quỹ (Tùy chọn)' : 'Trừ vào Quỹ (Tùy chọn)'}
                </label>
                <select className="w-full p-2 border rounded" value={goalId} onChange={e => setGoalId(e.target.value)}>
                  <option value="">-- Không chọn quỹ --</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({new Intl.NumberFormat('vi-VN').format(g.currentAmount)}đ)</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Nhãn quyền riêng tư</label>
              <select className="w-full p-2 border rounded" value={privacyTag} onChange={e => setPrivacyTag(e.target.value as any)}>
                <option value="FAMILY">Gia đình (Chung)</option>
                <option value="PERSONAL">Cá nhân (Riêng tư)</option>
                <option value="BUSINESS">Kinh doanh</option>
              </select>
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
