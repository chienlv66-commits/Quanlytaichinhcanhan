"use client";

import React, { useState } from 'react';
import { useFinanceStore } from '@/stores/financeStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Send, Loader2 } from 'lucide-react';
import IncomeAllocationModal from './IncomeAllocationModal';

export default function NLPTransactionInput() {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [savedIncomeAmount, setSavedIncomeAmount] = useState(0);
  const [savedIncomeCategory, setSavedIncomeCategory] = useState('');
  const { addManualTransaction } = useFinanceStore();

  const handleProcessNLP = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    
    // Giả lập NLP bóc tách (Trong thực tế sẽ gọi ChatGPT API hoặc Regex nội bộ)
    // Ví dụ text: "Tiền học con cả 4 triệu ck"
    await new Promise(resolve => setTimeout(resolve, 800)); // Giả lập network delay

    let amount = 0;
    let category = 'Uncategorized';
    let type: any = 'OPEX';
    let description = text;

    // Regex cơ bản tìm số tiền (vd: 4M, 4 triệu, 4.000.000)
    const amountMatch = text.match(/(\d+)\s*(triệu|tr|m|k)/i);
    if (amountMatch) {
      const detectCategory = (text: string) => {
        const t = text.toLowerCase();
        
        // Revenue
        if (t.match(/lương|thu nhập cố định/)) return { type: 'Revenue', category: 'Lương & Thu nhập cố định' };
        if (t.match(/thưởng|làm thêm|thu nhập ngoài/)) return { type: 'Revenue', category: 'Thưởng & Thu nhập ngoài' };
        if (t.match(/doanh thu|bán|etsy|tiktok|nhận|lãi kinh doanh|đầu tư/)) return { type: 'Revenue', category: 'Kinh doanh / Đầu tư' };
        if (t.match(/lì xì|biếu|cho|tặng/)) return { type: 'Revenue', category: 'Được biếu tặng / Lì xì' };
        
        // COGS (Needs)
        if (t.match(/thuê nhà|nhà trọ|điện|nước|internet|wifi|3g/)) return { type: 'COGS', category: 'Thuê nhà & Tiện ích' };
        if (t.match(/chợ|siêu thị|thức ăn|đồ ăn|gạo|sữa|rau|thịt/)) return { type: 'COGS', category: 'Đi chợ & Siêu thị' };
        if (t.match(/học phí|trường|con|giúp việc|trông trẻ|gia sư/)) return { type: 'COGS', category: 'Giáo dục & Học phí' };
        if (t.match(/xăng|xe|rửa xe|sửa xe|đổ xăng|bãi gửi/)) return { type: 'COGS', category: 'Xăng xe & Di chuyển' };
        if (t.match(/khám bệnh|thuốc|bảo hiểm|y tế|bệnh viện/)) return { type: 'COGS', category: 'Bảo hiểm & Y tế cơ bản' };
        if (t.match(/trả góp/)) return { type: 'COGS', category: 'Trả góp / Nợ cố định' };
        
        // OPEX (Wants)
        if (t.match(/nhậu|cafe|ăn ngoài|nhà hàng/)) return { type: 'OPEX', category: 'Ăn ngoài & Cafe' };
        if (t.match(/mua sắm|quần áo|đồ điện tử|shopee/)) return { type: 'OPEX', category: 'Mua sắm cá nhân' };
        if (t.match(/đám|hiếu|hỷ|cưới|thăm/)) return { type: 'OPEX', category: 'Hiếu hỷ & Biếu tặng' };
        if (t.match(/phim|du lịch|đồ chơi|giải trí/)) return { type: 'OPEX', category: 'Giải trí & Du lịch' };
        if (t.match(/làm đẹp|spa|cắt tóc|thể thao|gym/)) return { type: 'OPEX', category: 'Chăm sóc sắc đẹp / Thể thao' };
        
        // Non-Operating
        if (t.match(/lãi|tiết kiệm|cổ tức|trái phiếu/)) return { type: 'Non-Operating', category: 'Lãi tiết kiệm / Cổ tức' };
        if (t.match(/lãi vay|ngân hàng/)) return { type: 'Non-Operating', category: 'Chi phí lãi vay' };
        if (t.match(/thuế|tncn|vat/)) return { type: 'Non-Operating', category: 'Thuế' };

        return { type: 'OPEX', category: 'Khác (Linh hoạt)' }; // Fallback for unmatched words usually tends to be wants
      };
      const val = parseInt(amountMatch[1], 10);
      const unit = amountMatch[2].toLowerCase();
      if (unit === 'triệu' || unit === 'tr' || unit === 'm') amount = -val * 1000000;
      else if (unit === 'k') amount = -val * 1000;

      const result = detectCategory(text);
      category = result.category;
      type = result.type;
      if (type === 'Revenue') amount = Math.abs(amount);
    } else {
      // Fallback không tìm thấy
      amount = -100000;
    }

    await addManualTransaction({
      amount,
      category,
      type,
      description,
      source: 'Manual NLP'
    });

    setText('');
    setIsProcessing(false);

    if (type === 'Revenue') {
      setSavedIncomeAmount(Math.abs(amount));
      setSavedIncomeCategory(category);
      setShowAllocationModal(true);
    }
  };

  if (showAllocationModal) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center">
        <IncomeAllocationModal 
          incomeAmount={savedIncomeAmount} 
          incomeCategory={savedIncomeCategory}
          onClose={() => setShowAllocationModal(false)} 
        />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4 flex items-center gap-2">
        <input 
          type="text"
          placeholder="Nhập giao dịch (Vd: Tiền học con cả 4 triệu ck)..."
          className="flex-1 p-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleProcessNLP()}
          disabled={isProcessing}
        />
        <button 
          onClick={handleProcessNLP}
          disabled={isProcessing || !text.trim()}
          className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : <Send />}
        </button>
      </CardContent>
    </Card>
  );
}
