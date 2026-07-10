"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useFinanceStore } from '@/stores/financeStore';

export default function MortgageSimulator() {
  const { transactions } = useFinanceStore();
  
  const [homePrice, setHomePrice] = useState(3000000000);
  const [downPayment, setDownPayment] = useState(1000000000);
  const [loanTerm, setLoanTerm] = useState(20);
  const [promoRate, setPromoRate] = useState(7.5);
  const [floatRate, setFloatRate] = useState(11.5);

  const netIncome = useMemo(() => {
    // Tạm tính thu nhập ròng hàng tháng dựa trên Data (Ở đây giả lập là 50 triệu nếu chưa có data)
    let revenue = 0;
    transactions.forEach(tx => {
      if (tx.type === 'Revenue') revenue += Number(tx.amount);
    });
    return revenue > 0 ? (revenue / 12) : 50000000;
  }, [transactions]);

  const runway = 4; // Mock Runway = 4 tháng

  const results = useMemo(() => {
    const principal = homePrice - downPayment;
    const monthlyPrincipal = principal / (loanTerm * 12);
    
    const promoInterestMonthly = (principal * (promoRate / 100)) / 12;
    const floatInterestMonthly = (principal * (floatRate / 100)) / 12;

    const promoPayment = monthlyPrincipal + promoInterestMonthly;
    const floatPayment = monthlyPrincipal + floatInterestMonthly;

    const promoDTI = (promoPayment / netIncome) * 100;
    const floatDTI = (floatPayment / netIncome) * 100;

    return {
      principal,
      promoPayment,
      floatPayment,
      promoDTI,
      floatDTI
    };
  }, [homePrice, downPayment, loanTerm, promoRate, floatRate, netIncome]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(val);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Mô Phỏng Vay Mua Nhà</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Giá nhà (VNĐ)</label>
              <input type="number" className="w-full p-2 border rounded" value={homePrice} onChange={e => setHomePrice(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vốn tự có (VNĐ)</label>
              <input type="number" className="w-full p-2 border rounded" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thời hạn vay (Năm)</label>
              <input type="number" className="w-full p-2 border rounded" value={loanTerm} onChange={e => setLoanTerm(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lãi ưu đãi (%)</label>
                <input type="number" step="0.1" className="w-full p-2 border rounded" value={promoRate} onChange={e => setPromoRate(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lãi thả nổi (%)</label>
                <input type="number" step="0.1" className="w-full p-2 border rounded" value={floatRate} onChange={e => setFloatRate(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl space-y-4 border">
            <div>
              <div className="text-sm text-gray-500">Cần vay</div>
              <div className="text-xl font-bold">{formatCurrency(results.principal)} VNĐ</div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500">Trả góp lúc thả nổi (Dự kiến)</div>
              <div className="text-xl font-bold text-orange-600">{formatCurrency(results.floatPayment)} / tháng</div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-500">Tỷ lệ nợ/Thu nhập (DTI - Thả nổi)</div>
              <div className={`text-2xl font-bold ${results.floatDTI > 40 ? 'text-red-600' : 'text-green-600'}`}>
                {results.floatDTI.toFixed(1)}%
              </div>
            </div>
            
            {results.floatDTI > 40 && (
              <div className="p-3 bg-red-100 text-red-800 text-sm rounded-lg border border-red-200">
                <strong>Cảnh báo nguy hiểm:</strong> DTI thả nổi vượt 40% thu nhập ròng. Đề xuất tăng vốn tự có lên ít nhất {formatCurrency(homePrice - (40 * netIncome / 100 * loanTerm * 12 * 0.5))} VNĐ.
              </div>
            )}
            
            {runway < 3 && (
              <div className="p-3 bg-orange-100 text-orange-800 text-sm rounded-lg border border-orange-200">
                <strong>Quỹ dự phòng thấp:</strong> Runway hiện tại &lt; 3 tháng. Đề xuất cắt giảm chi tiêu SG&A trước khi quyết định vay.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
