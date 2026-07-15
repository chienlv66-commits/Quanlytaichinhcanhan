import React from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { CreditCard, Wallet, Building, PiggyBank, EyeOff } from 'lucide-react';

export default function AccountsDashboard() {
  const { accounts, isLoading, error } = useFinanceStore();

  const getIcon = (type: string) => {
    switch(type) {
      case 'CASH': return <Wallet className="text-emerald-500" />;
      case 'BANK': return <Building className="text-blue-500" />;
      case 'CREDIT': return <CreditCard className="text-purple-500" />;
      default: return <PiggyBank className="text-orange-500" />;
    }
  };

  const getPrivacyBadge = (tag: string) => {
    switch(tag) {
      case 'FAMILY': return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">Chung (Gia đình)</span>;
      case 'PERSONAL': return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1"><EyeOff size={12}/> Cá nhân</span>;
      case 'BUSINESS': return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">Kinh doanh</span>;
      default: return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">{tag}</span>;
    }
  };

  if (isLoading && accounts.length === 0) return <div className="text-center py-10">Đang tải tài khoản...</div>;
  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>;

  const totalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.Current_Balance) || 0) * (Number(acc.Exchange_Rate) || 1), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg text-gray-500 font-medium">Tổng số dư (Quy ra VNĐ)</h2>
          <div className="text-3xl font-bold mt-1 text-gray-900">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalBalance)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.Account_ID} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                {getIcon(acc.Account_Type)}
              </div>
              {getPrivacyBadge(acc.Privacy_Tag)}
            </div>
            <h3 className="font-semibold text-gray-900">{acc.Account_Name}</h3>
            <p className="text-sm text-gray-500 mb-3">{acc.Account_Type}</p>
            <div className="text-xl font-bold">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: acc.Currency || 'VND' }).format(Number(acc.Current_Balance) || 0)}
            </div>
            {acc.Currency !== 'VND' && (
              <div className="text-sm text-gray-400 mt-1">
                ≈ {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((Number(acc.Current_Balance) || 0) * (Number(acc.Exchange_Rate) || 1))}
              </div>
            )}
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-500">
            Chưa có tài khoản nào được hiển thị hoặc bạn không có quyền xem.
          </div>
        )}
      </div>
    </div>
  );
}
