import React, { useState } from 'react';
import { useFinanceStore, Account } from '@/stores/financeStore';
import { CreditCard, Wallet, Building, PiggyBank, EyeOff, Plus, X } from 'lucide-react';

export default function AccountsDashboard() {
  const { accounts, isLoading, error, createAccount, currentUser } = useFinanceStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAcc, setNewAcc] = useState<Partial<Account>>({
    Account_Name: '',
    Account_Type: 'CASH',
    Current_Balance: 0,
    Currency: 'VND',
    Privacy_Tag: 'FAMILY'
  });

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

  const handleCreate = async () => {
    if (!newAcc.Account_Name) return alert('Vui lòng nhập tên tài khoản');
    await createAccount(newAcc);
    setShowAddModal(false);
    setNewAcc({
      Account_Name: '',
      Account_Type: 'CASH',
      Current_Balance: 0,
      Currency: 'VND',
      Privacy_Tag: 'FAMILY'
    });
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
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus size={20} /> Thêm Tài Khoản
        </button>
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
              {(() => {
                try {
                  const curr = (acc.Currency?.trim()?.length === 3) ? acc.Currency.trim().toUpperCase() : 'VND';
                  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: curr }).format(Number(acc.Current_Balance) || 0);
                } catch(e) {
                  return `${Number(acc.Current_Balance) || 0} ${acc.Currency}`;
                }
              })()}
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

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Thêm Tài Khoản Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên tài khoản</label>
                <input type="text" className="w-full p-2 border rounded" placeholder="VD: Tiền mặt, Thẻ VCB..." value={newAcc.Account_Name} onChange={e => setNewAcc({...newAcc, Account_Name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loại tài khoản</label>
                <select className="w-full p-2 border rounded" value={newAcc.Account_Type} onChange={e => setNewAcc({...newAcc, Account_Type: e.target.value})}>
                  <option value="CASH">Tiền mặt (CASH)</option>
                  <option value="BANK">Ngân hàng (BANK)</option>
                  <option value="E-WALLET">Ví điện tử (E-WALLET)</option>
                  <option value="CREDIT">Thẻ tín dụng (CREDIT)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số dư ban đầu</label>
                <input type="number" className="w-full p-2 border rounded" value={newAcc.Current_Balance} onChange={e => setNewAcc({...newAcc, Current_Balance: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quyền riêng tư</label>
                <select className="w-full p-2 border rounded" value={newAcc.Privacy_Tag} onChange={e => setNewAcc({...newAcc, Privacy_Tag: e.target.value as any})}>
                  <option value="FAMILY">Chung (Gia đình)</option>
                  <option value="PERSONAL">Cá nhân (Chỉ mình bạn xem được)</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-2 border-t">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded font-medium text-gray-700 hover:bg-gray-100">Hủy</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Tạo Tài Khoản</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
