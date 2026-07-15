import React, { useState } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { Settings, Lock, User } from 'lucide-react';

export default function LoginScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { login, isLoading, error } = useFinanceStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      await login(username, password);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <button onClick={onOpenSettings} className="p-2 text-gray-500 hover:text-gray-900 bg-white rounded-full shadow">
          <Settings size={20} />
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center bg-blue-600 text-white">
          <h1 className="text-3xl font-bold">Lucea Finance</h1>
          <p className="mt-2 text-blue-100">Quản lý Tài chính Gia đình & Cá nhân</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tài khoản</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên đăng nhập"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{error}</div>}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-70"
            >
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
