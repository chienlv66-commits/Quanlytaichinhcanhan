"use client";

import React, { useEffect, useState } from 'react';
import { useFinanceStore, Goal } from '@/stores/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Plus, Target, Home, Car, Briefcase, AlertCircle, Edit2, X } from 'lucide-react';

export default function GoalsDashboard() {
  const { goals, fetchGoals, createGoal, updateGoal, deleteGoal } = useFinanceStore();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleAddGoal = async (newGoal: Partial<Goal>) => {
    if (editingGoal) {
      await updateGoal(editingGoal.Goal_ID || editingGoal.id, newGoal);
    } else {
      await createGoal(newGoal);
    }
    await fetchGoals();
    setShowAddGoal(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa quỹ này?')) {
      await deleteGoal(id);
      await fetchGoals();
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowAddGoal(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Mục Tiêu & Phân Bổ Quỹ</h2>
        <button 
          onClick={() => setShowAddGoal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          <Plus size={20} /> Thêm Quỹ Mục Tiêu
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {goals.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p>Chưa có mục tiêu nào được thiết lập.</p>
            <p className="text-sm mt-1">Hãy tạo một quỹ (VD: Mua nhà, Mua xe, Khẩn cấp) để bắt đầu phân bổ dòng tiền.</p>
          </div>
        ) : (
          goals.map(goal => {
            const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
            return (
              <Card key={goal.id} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {goal.type === 'House' && <Home className="text-blue-500" />}
                      {goal.type === 'Car' && <Car className="text-orange-500" />}
                      {goal.type === 'Business' && <Briefcase className="text-purple-500" />}
                      {goal.type === 'Emergency' && <AlertCircle className="text-red-500" />}
                      {goal.type === 'General' && <Target className="text-green-500" />}
                      <div className="flex flex-col">
                        <CardTitle className="text-lg">{goal.name}</CardTitle>
                        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">
                          {goal.category === 'Needs' ? 'Thiết yếu (Needs)' : goal.category === 'Wants' ? 'Linh hoạt (Wants)' : 'Tích lũy (Savings)'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditGoal(goal)} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteGoal(goal.Goal_ID || goal.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Đã tích lũy</span>
                      <span className="font-bold text-green-600">{formatCurrency(goal.currentAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Mục tiêu</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(goal.targetAmount)}</span>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2 overflow-hidden">
                      <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="text-right text-xs text-gray-500 font-medium">{progress}%</div>

                    {goal.loanPhases && goal.loanPhases.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600 space-y-1 bg-blue-50 p-3 rounded-lg">
                        <div className="font-semibold text-blue-800 mb-1 flex justify-between">
                          <span>Lộ trình vay vốn ({goal.loanPhases.reduce((acc, p) => acc + p.durationMonths, 0)} tháng)</span>
                          <span className="text-red-600">Dư nợ: {formatCurrency(goal.targetAmount - goal.currentAmount)}</span>
                        </div>
                        <div className="space-y-2 mt-2">
                          {goal.loanPhases.map((phase, idx) => (
                            <div key={phase.id} className="flex justify-between items-center border-b border-blue-100 pb-1">
                              <div>
                                <span className="font-medium">{idx + 1}. {phase.name}</span>
                                <span className="text-gray-500 ml-2">({phase.durationMonths} tháng)</span>
                              </div>
                              <span className="font-bold text-red-600">{phase.rate}% / năm</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-500 italic mt-2">* Chi tiết số tiền trả góp hàng tháng (dư nợ giảm dần) được hiển thị trong công cụ Phân tích.</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {showAddGoal && (
        <GoalSetupModal 
          initialData={editingGoal}
          onClose={() => {
            setShowAddGoal(false);
            setEditingGoal(null);
          }} 
          onSave={handleAddGoal} 
        />
      )}
    </div>
  );
}

function GoalSetupModal({ onClose, onSave, initialData }: { onClose: () => void, onSave: (g: Partial<Goal>) => void, initialData?: Goal | null }) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<Goal['type']>(initialData?.type || 'General');
  const [category, setCategory] = useState<Goal['category']>(initialData?.category || 'Savings');
  const [targetAmount, setTargetAmount] = useState(initialData?.targetAmount?.toString() || '');
  const [currentAmount, setCurrentAmount] = useState(initialData?.currentAmount?.toString() || '0');
  const [priority, setPriority] = useState(initialData?.priority?.toString() || '1');
  
  // Thông số vay nâng cao
  const [isLoan, setIsLoan] = useState(!!(initialData?.loanPhases && initialData.loanPhases.length > 0));
  const [loanPhases, setLoanPhases] = useState<{ id: string, name: string, rate: string, duration: string }[]>(
    initialData?.loanPhases?.map(p => ({
      id: p.id,
      name: p.name,
      rate: p.rate.toString(),
      duration: p.durationMonths.toString()
    })) || []
  );

  const handleAddPhase = () => {
    setLoanPhases([...loanPhases, { id: Date.now().toString(), name: 'Giai đoạn mới', rate: '0', duration: '12' }]);
  };

  const handleRemovePhase = (id: string) => {
    setLoanPhases(loanPhases.filter(p => p.id !== id));
  };

  const handleUpdatePhase = (id: string, field: string, value: string) => {
    setLoanPhases(loanPhases.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: Partial<Goal> = {
      Goal_Name: name,
      Goal_Type: category,
      Target_Amount: Number(targetAmount),
      Current_Amount: Number(currentAmount),
      Allocated_Percentage: 0,
      Privacy_Tag: 'FAMILY'
    };
    onSave(newGoal);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
           <AlertCircle size={24} className="opacity-0"/>
           <span className="absolute inset-0 flex items-center justify-center font-bold text-xl">X</span>
        </button>
        <CardHeader>
          <CardTitle>{initialData ? 'Sửa Quỹ Mục Tiêu' : 'Thiết lập Quỹ Mục tiêu & Đòn bẩy'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên mục tiêu</label>
                <input type="text" required placeholder="VD: Mua xe Fadil" className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mức độ ưu tiên (1 = Cao nhất)</label>
                <input type="number" min="1" required className="w-full p-2 border rounded" value={priority} onChange={e => setPriority(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nhóm phân bổ (50/30/20)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'Needs', label: 'Thiết yếu (50%)', class: 'bg-blue-50 border-blue-500 text-blue-700' },
                  { value: 'Wants', label: 'Linh hoạt (30%)', class: 'bg-orange-50 border-orange-500 text-orange-700' },
                  { value: 'Savings', label: 'Tích lũy (20%)', class: 'bg-green-50 border-green-500 text-green-700' }
                ].map(c => (
                  <button 
                    key={c.value} type="button"
                    onClick={() => setCategory(c.value as Goal['category'])}
                    className={`py-2 rounded border text-sm font-medium ${category === c.value ? c.class : 'bg-gray-50 text-gray-600'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Loại quỹ</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: 'House', label: 'Mua Nhà', icon: <Home size={16}/> },
                  { value: 'Car', label: 'Mua Xe', icon: <Car size={16}/> },
                  { value: 'Emergency', label: 'Khẩn cấp', icon: <AlertCircle size={16}/> },
                  { value: 'Business', label: 'Kinh doanh', icon: <Briefcase size={16}/> },
                  { value: 'General', label: 'Khác', icon: <Target size={16}/> }
                ].map(t => (
                  <button 
                    key={t.value} type="button"
                    onClick={() => setType(t.value as Goal['type'])}
                    className={`flex flex-col items-center justify-center p-2 rounded border text-[10px] gap-1 ${type === t.value ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-gray-50'}`}
                  >
                    {t.icon} <span className="text-center">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Số tiền cần đạt</label>
                <input type="number" required placeholder="500000000" className="w-full p-2 border rounded" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Đã có sẵn (Vốn tự có)</label>
                <input type="number" required className="w-full p-2 border rounded" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <input type="checkbox" id="isLoan" checked={isLoan} onChange={e => setIsLoan(e.target.checked)} className="rounded" />
              <label htmlFor="isLoan" className="text-sm font-medium">Sử dụng đòn bẩy (Vay mượn nhiều giai đoạn)</label>
            </div>

            {isLoan && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-blue-800 font-semibold">Lộ trình Vay vốn (Dư nợ giảm dần)</div>
                  <div className="text-sm">Vay: <span className="font-bold text-red-600">{(Number(targetAmount) - Number(currentAmount)).toLocaleString('vi-VN')} đ</span></div>
                </div>
                
                {loanPhases.map((phase, idx) => (
                  <div key={phase.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-blue-100">
                    <div className="col-span-1 text-center text-xs font-bold text-gray-500">{idx + 1}</div>
                    <div className="col-span-4">
                      <input type="text" placeholder="Tên (VD: Ưu đãi)" className="w-full p-1 border rounded text-xs" value={phase.name} onChange={e => handleUpdatePhase(phase.id, 'name', e.target.value)} />
                    </div>
                    <div className="col-span-3 relative">
                      <input type="number" step="0.1" placeholder="Lãi" className="w-full p-1 border rounded text-xs pr-4" value={phase.rate} onChange={e => handleUpdatePhase(phase.id, 'rate', e.target.value)} />
                      <span className="absolute right-1 top-1 text-xs text-gray-400">%</span>
                    </div>
                    <div className="col-span-3 relative">
                      <input type="number" placeholder="Tháng" className="w-full p-1 border rounded text-xs pr-6" value={phase.duration} onChange={e => handleUpdatePhase(phase.id, 'duration', e.target.value)} />
                      <span className="absolute right-1 top-1 text-xs text-gray-400">th</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <button type="button" onClick={() => handleRemovePhase(phase.id)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                    </div>
                  </div>
                ))}

                <button type="button" onClick={handleAddPhase} className="w-full py-2 border border-dashed border-blue-300 rounded text-blue-600 text-sm font-medium hover:bg-blue-100">+ Thêm Giai đoạn vay</button>
              </div>
            )}

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 mt-6">
              {initialData ? 'Cập nhật Quỹ' : 'Lưu Quỹ Mục Tiêu'}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
