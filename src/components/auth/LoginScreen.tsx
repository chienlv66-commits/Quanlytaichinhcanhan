"use client";

import React, { useState } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Settings, Lock } from 'lucide-react';

export default function LoginScreen({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { setUserRole } = useFinanceStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '9999') {
      setUserRole('admin');
    } else if (pin === '1234') {
      setUserRole('child');
    } else {
      setError('Mã PIN không đúng. Vui lòng thử lại.');
      setPin('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="absolute top-4 right-4">
        <button onClick={onOpenSettings} className="p-2 text-gray-500 hover:text-gray-900" title="Cài đặt kết nối">
          <Settings size={24} />
        </button>
      </div>
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
            <Lock className="text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>Nhập mã PIN để truy cập hệ thống gia đình</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                className="w-full text-center text-3xl tracking-widest p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setError('');
                  setPin(e.target.value);
                }}
              />
              {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </div>
            
            <button 
              type="submit" 
              className="w-full p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors"
              disabled={pin.length < 4}
            >
              Vào trong
            </button>
          </form>
          
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>Admin PIN mặc định: 9999</p>
            <p>Child PIN mặc định: 1234</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
