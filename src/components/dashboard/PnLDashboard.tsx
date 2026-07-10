"use client";

import React, { useEffect, useMemo } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowDownIcon, ArrowUpIcon, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function PnLDashboard() {
  const { transactions, fetchPnL, isLoading, error } = useFinanceStore();

  useEffect(() => {
    fetchPnL();
  }, [fetchPnL]);

  // Tính toán P&L theo thuật ngữ Tài chính cá nhân
  const { pnl, pnlSummary } = useMemo(() => {
    const pnl = transactions.reduce((acc, tx) => {
      const amt = Number(tx.amount);
      
      // Thu nhập (Revenue)
      if (['Lương & Thu nhập cố định', 'Thưởng & Thu nhập ngoài', 'Kinh doanh / Đầu tư', 'Được biếu tặng / Lì xì', 'Tổng doanh thu (Gross Revenue)'].includes(tx.category) || tx.type === 'Revenue') acc.revenue += amt;
      
      // Thiết yếu (COGS)
      if (['Thuê nhà & Tiện ích', 'Đi chợ & Siêu thị', 'Giáo dục & Học phí', 'Xăng xe & Di chuyển', 'Bảo hiểm & Y tế cơ bản', 'Trả góp / Nợ cố định', 'Khác (Thiết yếu)'].includes(tx.category)) {
        if (tx.category.includes('Đi chợ')) acc.needs_groceries += amt;
        else if (tx.category.includes('Thuê nhà')) acc.needs_utilities += amt;
        else if (tx.category.includes('Giáo dục')) acc.needs_edu += amt;
        else acc.needs_other += amt;
      }
      
      // Linh hoạt (OPEX)
      if (['Ăn ngoài & Cafe', 'Mua sắm cá nhân', 'Giải trí & Du lịch', 'Chăm sóc sắc đẹp / Thể thao', 'Hiếu hỷ & Biếu tặng', 'Khác (Linh hoạt)'].includes(tx.category)) {
        if (tx.category.includes('Ăn ngoài')) acc.wants_dining += amt;
        else if (tx.category.includes('Mua sắm')) acc.wants_shopping += amt;
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
    const savingsAndInvestments = totalIncome - totalNeeds - totalWants + pnl.investments;

    const pnlSummary = { totalIncome, totalNeeds, totalWants, savingsAndInvestments };
    return { pnl, pnlSummary };
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const pieData = [
    { name: 'Thiết yếu (Needs)', value: pnlSummary.totalNeeds, color: '#3b82f6' },
    { name: 'Linh hoạt (Wants)', value: pnlSummary.totalWants, color: '#f59e0b' },
    { name: 'Tích lũy (Savings)', value: pnlSummary.savingsAndInvestments > 0 ? pnlSummary.savingsAndInvestments : 0, color: '#10b981' }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Báo cáo Dòng Tiền (50/30/20)</h2>
      
      {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">Lỗi: {error}</div>}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Tổng Thu Nhập" 
          value={formatCurrency(pnlSummary.totalIncome)} 
          icon={<ArrowUpIcon className="h-4 w-4 text-green-500" />} 
        />
        <MetricCard 
          title="Chi phí Thiết yếu (Needs)" 
          value={formatCurrency(pnlSummary.totalNeeds)} 
          subtitle={`${pnlSummary.totalIncome > 0 ? Math.round(pnlSummary.totalNeeds / pnlSummary.totalIncome * 100) : 0}% thu nhập`}
          icon={<Activity className="h-4 w-4 text-blue-500" />} 
        />
        <MetricCard 
          title="Chi phí Linh hoạt (Wants)" 
          value={formatCurrency(pnlSummary.totalWants)} 
          subtitle={`${pnlSummary.totalIncome > 0 ? Math.round(pnlSummary.totalWants / pnlSummary.totalIncome * 100) : 0}% thu nhập`}
          icon={<Activity className="h-4 w-4 text-orange-500" />} 
        />
        <MetricCard 
          title="Tích lũy & Đầu tư" 
          value={formatCurrency(pnlSummary.savingsAndInvestments)} 
          subtitle={`${pnlSummary.totalIncome > 0 ? Math.round(pnlSummary.savingsAndInvestments / pnlSummary.totalIncome * 100) : 0}% thu nhập`}
          icon={<ArrowDownIcon className="h-4 w-4 text-emerald-500" />} 
          highlight={pnlSummary.savingsAndInvestments > 0}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader><CardTitle>Cơ cấu Chi tiêu</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
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
          </CardContent>
        </Card>
      
        <div className="col-span-2 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Chi tiết Thiết yếu</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Đi chợ & Siêu thị</span><span>{formatCurrency(Math.abs(pnl.needs_groceries))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Điện, Nước, Internet</span><span>{formatCurrency(Math.abs(pnl.needs_utilities))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Giáo dục & Học phí</span><span>{formatCurrency(Math.abs(pnl.needs_edu))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Khác</span><span>{formatCurrency(Math.abs(pnl.needs_other))}</span></div>
              <div className="flex justify-between py-1 border-t font-medium"><span className="text-gray-800">Tổng Needs</span><span>{formatCurrency(pnlSummary.totalNeeds)}</span></div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Chi tiết Linh hoạt</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between"><span className="text-gray-500">Ăn ngoài & Cafe</span><span>{formatCurrency(Math.abs(pnl.wants_dining))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Mua sắm cá nhân</span><span>{formatCurrency(Math.abs(pnl.wants_shopping))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Giải trí & Du lịch</span><span>{formatCurrency(Math.abs(pnl.wants_entertainment))}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Khác</span><span>{formatCurrency(Math.abs(pnl.wants_other))}</span></div>
              <div className="flex justify-between py-1 border-t font-medium"><span className="text-gray-800">Tổng Wants</span><span>{formatCurrency(pnlSummary.totalWants)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle>Giao dịch gần đây</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-gray-500 text-sm">Chưa có giao dịch nào được ghi nhận.</div>
          ) : (
            <div className="space-y-4">
              {transactions.slice().reverse().slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex justify-between items-center pb-2 border-b last:border-0">
                  <div>
                    <div className="font-medium text-gray-800">{tx.description}</div>
                    <div className="text-xs text-gray-500">{tx.category} • {new Date(tx.timestamp).toLocaleString('vi-VN')}</div>
                  </div>
                  <div className={`font-bold ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
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

function MetricCard({ title, value, subtitle, icon, highlight }: { title: string, value: string, subtitle?: string, icon: React.ReactNode, highlight?: boolean }) {
  return (
    <Card className={highlight ? 'bg-emerald-50 border-emerald-200' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-emerald-700' : ''}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
