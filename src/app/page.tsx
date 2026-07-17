"use client";

import React, { useState } from 'react';
import PnLDashboard from '@/components/dashboard/PnLDashboard';
import SwipeApproval from '@/components/staging/SwipeApproval';
import GoalsDashboard from '@/components/dashboard/GoalsDashboard';
import AccountsDashboard from '@/components/dashboard/AccountsDashboard';
import PersonalDashboard from '@/components/dashboard/PersonalDashboard';
import NLPTransactionInput from '@/components/input/NLPTransactionInput';
import ManualTransactionModal from '@/components/input/ManualTransactionModal';
import LoginScreen from '@/components/auth/LoginScreen';
import YouthDashboard from '@/components/dashboard/YouthDashboard';
import InvestmentDashboard from '@/components/dashboard/InvestmentDashboard';
import { useFinanceStore } from '@/stores/financeStore';
import { Settings, LayoutDashboard, Layers, Home, Plus, LogOut, TrendingUp, User } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'staging' | 'goals' | 'investments' | 'accounts' | 'personal'>('dashboard');
  const [showManualModal, setShowManualModal] = useState(false);
  const { gasUrl, setGasUrl, currentUser, logout } = useFinanceStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  React.useEffect(() => {
    setIsHydrated(true);
    setIsSettingsOpen(!gasUrl);
    setTempUrl(gasUrl || '');
  }, [gasUrl]);

  // Fetch initial data when user logs in
  React.useEffect(() => {
    if (currentUser) {
      useFinanceStore.getState().fetchAccounts();
      useFinanceStore.getState().fetchTransactions();
    }
  }, [currentUser]);

  if (!isHydrated) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Đang tải...</div>;
  }

  if (isSettingsOpen || !gasUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 z-50 fixed inset-0">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Thiết lập kết nối</h1>
            <p className="text-sm text-gray-500 mt-2">Vui lòng nhập URL của Google Apps Script dành riêng cho gia đình bạn.</p>
          </div>
          <div className="space-y-4">
            <input 
              type="text" 
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={tempUrl}
              onChange={e => setTempUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && tempUrl) {
                  setGasUrl(tempUrl.trim());
                  setIsSettingsOpen(false);
                }
              }}
            />
            <div className="flex gap-4">
              {gasUrl && (
                <button 
                  className="w-1/3 p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Huỷ
                </button>
              )}
              <button 
                className="flex-1 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                onClick={() => {
                  if (tempUrl) {
                    setGasUrl(tempUrl.trim());
                    setIsSettingsOpen(false);
                  }
                }}
              >
                Kết nối / Lưu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser && !isSettingsOpen) {
    return <LoginScreen onOpenSettings={() => setIsSettingsOpen(true)} />;
  }

  if (currentUser?.Role === 'VIEWER') {
    return <YouthDashboard />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 md:pb-0 md:pt-16">
      
      {/* Top Navbar cho Desktop */}
      <nav className="hidden md:flex fixed top-0 w-full bg-white shadow-sm z-50 px-6 py-4 justify-between items-center">
        <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          Quản lý Tài chính
        </div>
        <div className="flex gap-8">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Lãi/Lỗ" />
          <NavItem active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Layers />} label="Tài khoản" />
          <NavItem active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={<User />} label="Cá nhân" />
          <NavItem active={activeTab === 'staging'} onClick={() => setActiveTab('staging')} icon={<Layers />} label="Hàng chờ duyệt" />
          <NavItem active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Home />} label="Mục tiêu" />
          <NavItem active={activeTab === 'investments'} onClick={() => setActiveTab('investments')} icon={<TrendingUp />} label="Đầu tư" />
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2 p-2 text-gray-500 hover:text-gray-900 font-medium" title="Cài đặt">
            <Settings size={20} /> <span className="hidden md:inline">Cài đặt</span>
          </button>
          <button onClick={() => logout()} className="flex items-center gap-2 p-2 text-red-500 hover:text-red-700 font-medium" title="Đăng xuất">
            <LogOut size={20} /> <span className="hidden md:inline">Thoát ({currentUser?.Full_Name})</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* NLP Input luôn hiện ở trên để dễ nhập liệu nhanh */}
        <div className="mb-8 flex gap-2">
          <div className="flex-1">
            <NLPTransactionInput />
          </div>
          <button 
            onClick={() => setShowManualModal(true)}
            className="p-4 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 flex items-center justify-center shrink-0 aspect-square"
            title="Thêm giao dịch thủ công"
          >
            <Plus size={24} />
          </button>
        </div>

        {activeTab === 'dashboard' && <PnLDashboard />}
        {activeTab === 'accounts' && <AccountsDashboard />}
        {activeTab === 'personal' && <PersonalDashboard />}
        {activeTab === 'staging' && <SwipeApproval />}
        {activeTab === 'goals' && <GoalsDashboard />}
        {activeTab === 'investments' && <InvestmentDashboard />}
      </main>

      {/* Bottom Tabbar cho Mobile */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t flex overflow-x-auto p-2 pb-safe z-50 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `nav::-webkit-scrollbar { display: none; }`}} />
        <div className="flex gap-6 px-4 min-w-max">
          <TabItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Lãi/Lỗ" />
          <TabItem active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Layers />} label="Tài khoản" />
          <TabItem active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={<User />} label="Cá nhân" />
          <TabItem active={activeTab === 'staging'} onClick={() => setActiveTab('staging')} icon={<Layers />} label="Hàng đợi" />
          <TabItem active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Home />} label="Mục tiêu" />
          <TabItem active={activeTab === 'investments'} onClick={() => setActiveTab('investments')} icon={<TrendingUp />} label="Đầu tư" />
          <TabItem active={false} onClick={() => setIsSettingsOpen(true)} icon={<Settings />} label="Cài đặt" />
        </div>
      </nav>

      {/* Floating Action Button (Mobile only) */}
      <button 
        onClick={() => setShowManualModal(true)}
        className="md:hidden fixed bottom-24 right-6 p-4 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 z-40 flex items-center justify-center"
      >
        <Plus size={24} />
      </button>

      {/* Modals */}
      {showManualModal && <ManualTransactionModal onClose={() => setShowManualModal(false)} />}
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 font-medium transition-colors ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
    >
      <div className="w-5 h-5">{icon}</div>
      <span>{label}</span>
    </button>
  );
}

function TabItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className="w-6 h-6">{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
