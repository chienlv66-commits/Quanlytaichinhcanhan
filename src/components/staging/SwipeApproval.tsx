"use client";

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useFinanceStore, StagingTransaction } from '@/stores/financeStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Check, X, Edit2 } from 'lucide-react';

export default function SwipeApproval() {
  const { staging, fetchStaging, approveStaging, isLoading, error } = useFinanceStore();
  
  useEffect(() => {
    fetchStaging();
  }, [fetchStaging]);

  if (isLoading && staging.length === 0) return <div className="p-4 text-center">Đang tải dữ liệu chờ duyệt...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Lỗi: {error}</div>;
  if (staging.length === 0) return <div className="p-4 text-center text-gray-500">Không có giao dịch chờ duyệt. Mọi thứ đã hoàn tất!</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto relative perspective-1000">
      <h3 className="text-xl font-semibold mb-6">Khu vực chờ duyệt ({staging.length})</h3>
      
      <div className="relative w-full h-[300px]">
        <AnimatePresence>
          {staging.map((tx, index) => (
            <SwipeCard 
              key={tx.id} 
              transaction={tx} 
              index={index} 
              total={staging.length}
              onApprove={(id) => approveStaging(id, { status: 'APPROVED' })}
              onEdit={(id) => {
                // Trong thực tế, mở modal Edit. Ở đây ta tạm duyệt thẳng với Category mặc định
                console.log('Edit', id);
              }}
            />
          )).reverse()}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-between w-full px-8 mt-8">
        <button className="p-4 rounded-full bg-red-100 text-red-600 shadow"><X size={24} /></button>
        <button className="p-4 rounded-full bg-blue-100 text-blue-600 shadow"><Edit2 size={24} /></button>
        <button className="p-4 rounded-full bg-green-100 text-green-600 shadow"><Check size={24} /></button>
      </div>
    </div>
  );
}

function SwipeCard({ transaction, index, total, onApprove, onEdit }: { 
  transaction: StagingTransaction, 
  index: number, 
  total: number,
  onApprove: (id: string) => void,
  onEdit: (id: string) => void
}) {
  const isFront = index === 0;
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (e: any, info: any) => {
    if (info.offset.x > 100) {
      onApprove(transaction.id);
    } else if (info.offset.x < -100) {
      onEdit(transaction.id);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <motion.div
      style={{
        x,
        rotate,
        opacity: isFront ? 1 : 0.8,
        scale: isFront ? 1 : 1 - index * 0.05,
        y: isFront ? 0 : index * 10,
        zIndex: total - index
      }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: isFront ? 1 : 1 - index * 0.05, opacity: isFront ? 1 : 0.8 }}
      exit={{ x: x.get() > 0 ? 300 : -300, opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      whileDrag={{ cursor: 'grabbing' }}
      className="absolute top-0 left-0 w-full h-full cursor-grab"
    >
      <Card className="w-full h-full shadow-xl bg-white flex flex-col justify-center">
        <CardContent className="p-6 text-center">
          <div className="text-sm text-gray-500 mb-2">{new Date(transaction.timestamp).toLocaleString('vi-VN')}</div>
          <div className={`text-4xl font-bold mb-4 ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
          </div>
          <div className="text-lg font-medium text-gray-800 mb-2">{transaction.description}</div>
          <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
            {transaction.source}
          </div>
          
          <div className="mt-8 flex justify-between text-xs font-semibold uppercase tracking-wider">
            <span className="text-red-400">Vuốt trái để Sửa</span>
            <span className="text-green-400">Phải để Duyệt</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
