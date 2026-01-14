import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Mic, Send, Calendar, PieChart, TrendingUp, Trash2, Edit2, Download, AlertCircle, CheckCircle, Plus, X, Landmark, Coins, LineChart, CreditCard, DollarSign, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';
import * as geminiService from '../services/gemini';
import * as storageService from '../services/storage';
import { Transaction, MonthlyBudget, TransactionCategory, Account, AccountType } from '../types';

// Speech Recognition Type
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

const FinanceManager: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  
  // Input State
  const [inputText, setInputText] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(''); // For transaction entry
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // View State
  const [viewMode, setViewMode] = useState<'dashboard' | 'assets' | 'calendar' | 'list'>('dashboard');
  
  // Modals
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [tempBudgetLimit, setTempBudgetLimit] = useState('');
  
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [tempAccountName, setTempAccountName] = useState('');
  const [tempAccountType, setTempAccountType] = useState<AccountType>('bank');
  const [tempAccountBalance, setTempAccountBalance] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedTx = storageService.loadTransactions();
    setTransactions(loadedTx.sort((a, b) => b.timestamp - a.timestamp));

    const loadedAcc = storageService.loadAccounts();
    setAccounts(loadedAcc);
    if (loadedAcc.length > 0) setSelectedAccountId(loadedAcc[0].id);

    const allBudgets = storageService.loadBudgets();
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const found = allBudgets.find(b => b.month === currentMonthStr);
    if (found) setBudget(found);
  };

  const saveTx = (newTxList: Transaction[]) => {
    setTransactions(newTxList);
    storageService.saveTransactions(newTxList);
  };

  const updateAccountBalance = (accountId: string, amountChange: number) => {
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === accountId) {
        return { ...acc, balance: acc.balance + amountChange };
      }
      return acc;
    });
    setAccounts(updatedAccounts);
    storageService.saveAccounts(updatedAccounts);
  };

  // --- AI Input Handler ---
  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    
    try {
      const result = await geminiService.parseFinancialText(inputText);
      
      if (result) {
        // Determine amount logic (Income adds, Expense subtracts)
        const amount = result.amount;
        const type = result.type || 'expense'; // Default to expense if AI misses
        
        // Find best guess account if none selected, or use selected
        const targetAccountId = selectedAccountId || accounts[0]?.id;

        const newTx: Transaction = {
          id: crypto.randomUUID(),
          amount: amount,
          category: result.category,
          description: result.description,
          date: selectedDate,
          timestamp: Date.now(),
          accountId: targetAccountId,
          type: type
        };

        const updated = [newTx, ...transactions];
        saveTx(updated);
        
        // Update balance
        if (targetAccountId) {
            const balanceChange = type === 'expense' ? -amount : amount;
            updateAccountBalance(targetAccountId, balanceChange);
        }

        setInputText('');
      } else {
        alert("AI không hiểu nội dung này. Vui lòng nhập rõ hơn (ví dụ: '50k ăn trưa' hoặc 'Lương về 20 triệu').");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Trình duyệt này không hỗ trợ nhập liệu giọng nói.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
    };

    recognition.start();
  };

  // --- Account Handling ---
  const handleSaveAccount = () => {
    if (!tempAccountName) return;
    const balance = parseInt(tempAccountBalance.replace(/\D/g, '')) || 0;

    let updatedAccounts: Account[];

    if (editingAccountId) {
        // Edit existing
        updatedAccounts = accounts.map(acc => 
            acc.id === editingAccountId 
                ? { ...acc, name: tempAccountName, type: tempAccountType, balance: balance }
                : acc
        );
    } else {
        // Add new
        const newAccount: Account = {
            id: crypto.randomUUID(),
            name: tempAccountName,
            type: tempAccountType,
            balance: balance,
            color: tempAccountType === 'bank' ? '#3b82f6' : tempAccountType === 'investment' ? '#a855f7' : '#10b981'
        };
        updatedAccounts = [...accounts, newAccount];
    }

    setAccounts(updatedAccounts);
    storageService.saveAccounts(updatedAccounts);
    setShowAccountModal(false);
    setEditingAccountId(null);
    setTempAccountName('');
    setTempAccountBalance('');
    
    // Auto select if it's the first one
    if (accounts.length === 0 && updatedAccounts.length > 0) {
        setSelectedAccountId(updatedAccounts[0].id);
    }
  };

  const handleDeleteAccount = (id: string) => {
      if (confirm('Xóa tài khoản này? Lịch sử giao dịch liên quan sẽ không bị xóa nhưng sẽ mất liên kết.')) {
          const updated = accounts.filter(a => a.id !== id);
          setAccounts(updated);
          storageService.saveAccounts(updated);
          if (selectedAccountId === id && updated.length > 0) {
              setSelectedAccountId(updated[0].id);
          }
      }
  };

  const openEditAccount = (acc: Account) => {
      setEditingAccountId(acc.id);
      setTempAccountName(acc.name);
      setTempAccountType(acc.type);
      setTempAccountBalance(acc.balance.toString());
      setShowAccountModal(true);
  };

  // --- Budget Handling ---
  const handleSaveBudget = () => {
    const limit = parseInt(tempBudgetLimit.replace(/\D/g, ''));
    if (!limit) return;

    const monthStr = new Date().toISOString().slice(0, 7);
    const newBudget: MonthlyBudget = { month: monthStr, limit };
    
    const allBudgets = storageService.loadBudgets().filter(b => b.month !== monthStr);
    allBudgets.push(newBudget);
    
    storageService.saveBudgets(allBudgets);
    setBudget(newBudget);
    setShowBudgetModal(false);
  };

  const handleDeleteTx = (id: string) => {
    if (confirm("Xóa giao dịch này? Số dư tài khoản sẽ được hoàn lại.")) {
      const tx = transactions.find(t => t.id === id);
      if (tx && tx.accountId) {
          // Reverse balance effect
          const reverseChange = tx.type === 'expense' ? tx.amount : -tx.amount;
          updateAccountBalance(tx.accountId, reverseChange);
      }
      
      const updated = transactions.filter(t => t.id !== id);
      saveTx(updated);
    }
  };

  const handleExportCSV = () => {
    const headers = "ID,Date,Type,Category,Description,Amount,Account\n";
    const rows = transactions.map(t => {
      const accName = accounts.find(a => a.id === t.accountId)?.name || 'Unknown';
      return `${t.id},${t.date},${t.type},${t.category},"${t.description}",${t.amount},${accName}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `finance_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // --- Stats Calculation ---
  const getTotalNetWorth = () => {
      return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  };

  const getTodayExpense = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return transactions
      .filter(t => t.date === todayStr && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getMonthExpense = (targetDate: Date = new Date()) => {
    const prefix = targetDate.toISOString().slice(0, 7); // YYYY-MM
    return transactions
      .filter(t => t.date.startsWith(prefix) && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const totalExpense = transactions
        .filter(t => t.date === dateStr && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      data.push({
        name: `${d.getDate()}/${d.getMonth()+1}`,
        amount: totalExpense
      });
    }
    return data;
  };

  const getCategoryData = () => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const catMap: Record<string, number> = {};
    
    transactions
      .filter(t => t.date.startsWith(currentMonthPrefix) && t.type === 'expense')
      .forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      });

    return Object.keys(catMap).map(key => ({
      name: key,
      value: catMap[key]
    }));
  };

  const CATEGORY_COLORS: Record<string, string> = {
    'Ăn uống': '#F87171', // Red
    'Đi chơi': '#A78BFA', // Purple
    'Di chuyển': '#60A5FA', // Blue
    'Mua sắm': '#FBBF24', // Amber
    'Hóa đơn': '#34D399', // Emerald
    'Đầu tư': '#a855f7', // Violet
    'Lương': '#10b981', // Emerald
    'Thưởng': '#22d3ee', // Cyan
    'Khác': '#94A3B8'   // Slate
  };

  // --- Render Calendar Grid ---
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const padding = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-white font-bold capitalize">Tháng {month + 1}/{year}</h3>
           <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-1 hover:bg-slate-800 rounded text-slate-400">Prev</button>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-1 hover:bg-slate-800 rounded text-slate-400">Next</button>
           </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
            <div key={d} className="text-slate-500 font-medium py-1">{d}</div>
          ))}
          {padding.map((_, i) => <div key={`pad-${i}`}></div>)}
          {days.map(d => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dailyTx = transactions.filter(t => t.date === dateStr);
            const dailyExpense = dailyTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            return (
              <div key={d} className={`aspect-square rounded-lg border border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 ${dailyExpense > 0 ? 'bg-slate-800' : ''}`}>
                 <span className="text-slate-300 font-bold">{d}</span>
                 {dailyExpense > 0 && (
                   <span className="text-[10px] text-red-400 font-medium truncate w-full px-1">
                     -{dailyExpense >= 1000 ? `${(dailyExpense/1000).toFixed(0)}k` : dailyExpense}
                   </span>
                 )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getAccountIcon = (type: AccountType) => {
      switch(type) {
          case 'bank': return <Landmark size={24} className="text-blue-400"/>;
          case 'investment': return <TrendingUp size={24} className="text-purple-400"/>;
          case 'saving': return <Coins size={24} className="text-yellow-400"/>;
          default: return <Wallet size={24} className="text-emerald-400"/>;
      }
  };

  // --- Main Render ---
  return (
    <div className="w-full h-full flex flex-col bg-slate-950 overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
         <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wallet className="text-emerald-500" size={24} /> Quản Lý Tài Chính
            </h2>
            <p className="text-sm text-slate-400">Theo dõi chi tiêu, quản lý tài khoản & đầu tư</p>
         </div>
         <div className="flex gap-2">
            <button 
              onClick={() => setShowBudgetModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition border border-slate-700 flex items-center gap-2"
            >
              <Edit2 size={16}/> Ngân sách
            </button>
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition border border-slate-700 flex items-center gap-2"
            >
              <Download size={16}/> Xuất Excel
            </button>
         </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Main Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Total Net Worth */}
           <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/20 rounded-xl p-5">
              <div className="text-blue-200 text-sm mb-1 flex items-center gap-2"><DollarSign size={14}/> Tổng tài sản</div>
              <div className="text-3xl font-bold text-white tracking-tight">
                {getTotalNetWorth().toLocaleString()} <span className="text-sm text-slate-400 font-normal">đ</span>
              </div>
           </div>
           
           {/* Month Expense */}
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="text-slate-400 text-sm mb-1">Đã chi tháng này</div>
              <div className="text-2xl font-bold text-red-400">
                {getMonthExpense().toLocaleString()} <span className="text-sm text-slate-500 font-normal">đ</span>
              </div>
           </div>

           {/* Budget Progress */}
           <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 relative z-10">
                 <div className="text-slate-400 text-sm">Ngân sách còn lại</div>
                 {budget && (
                   <span className={`text-xs font-bold px-2 py-0.5 rounded ${getMonthExpense() > budget.limit ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                     {getMonthExpense() > budget.limit ? 'Vượt mức!' : 'An toàn'}
                   </span>
                 )}
              </div>
              
              {budget ? (
                <div className="relative z-10">
                   <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-bold ${getMonthExpense() > budget.limit ? 'text-red-400' : 'text-white'}`}>
                        {(budget.limit - getMonthExpense()).toLocaleString()} đ
                      </span>
                   </div>
                   <div className="w-full bg-slate-800 h-1.5 mt-3 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getMonthExpense() > budget.limit ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min((getMonthExpense() / budget.limit) * 100, 100)}%` }}
                      ></div>
                   </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm relative z-10">
                   <button onClick={() => setShowBudgetModal(true)} className="text-emerald-400 underline">Thiết lập ngay</button>
                </div>
              )}
           </div>
        </div>

        {/* AI Input Area */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-3">
           <div className="text-xs font-bold text-emerald-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
               <Sparkles size={12} /> AI Quick Add
           </div>
           <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                 <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder='Nhập tự nhiên: "35k ăn sáng", "Nhận lương 20 triệu", "Mua 500k chứng khoán"...'
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2.5 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none h-[48px] leading-tight pt-3.5"
                 />
                 <button 
                   onClick={handleVoiceInput}
                   className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-white'}`}
                   title="Nhập bằng giọng nói"
                 >
                    <Mic size={16} />
                 </button>
              </div>
              
              <div className="flex gap-2 items-center">
                 <div className="flex flex-col gap-1 w-[120px]">
                    <select 
                        value={selectedAccountId}
                        onChange={(e) => setSelectedAccountId(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-1 focus:ring-1 focus:ring-emerald-500 h-[22px]"
                    >
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-1 focus:ring-1 focus:ring-emerald-500 h-[22px]"
                    />
                 </div>
                 <button 
                   onClick={handleAnalyze}
                   disabled={isProcessing || !inputText.trim()}
                   className="h-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition disabled:opacity-50 whitespace-nowrap shadow-lg shadow-emerald-900/20"
                 >
                    {isProcessing ? <Plus className="animate-spin" size={16}/> : <Send size={16}/>}
                    Xử lý
                 </button>
              </div>
           </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-6 border-b border-slate-800 overflow-x-auto no-scrollbar">
           <button onClick={() => setViewMode('dashboard')} className={`pb-3 text-sm font-medium transition whitespace-nowrap ${viewMode === 'dashboard' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}>
             Tổng quan
           </button>
           <button onClick={() => setViewMode('assets')} className={`pb-3 text-sm font-medium transition whitespace-nowrap ${viewMode === 'assets' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}>
             Tài sản & Tài khoản
           </button>
           <button onClick={() => setViewMode('calendar')} className={`pb-3 text-sm font-medium transition whitespace-nowrap ${viewMode === 'calendar' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}>
             Lịch chi tiêu
           </button>
           <button onClick={() => setViewMode('list')} className={`pb-3 text-sm font-medium transition whitespace-nowrap ${viewMode === 'list' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}>
             Lịch sử giao dịch
           </button>
        </div>

        {/* Views Content */}
        <div className="min-h-[400px]">
           {viewMode === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                 
                 {/* Chart 1: 7 Days Trend */}
                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-400"/> Chi tiêu 7 ngày qua</h3>
                    <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getLast7DaysData()}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                             <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                             <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                             <Tooltip 
                               cursor={{fill: '#334155', opacity: 0.2}} 
                               contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                               formatter={(value: number) => [`${value.toLocaleString()} đ`, 'Chi tiêu']}
                             />
                             <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                          </BarChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Chart 2: Categories Pie */}
                 <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><PieChart size={18} className="text-purple-400"/> Phân bổ chi tiêu (Tháng này)</h3>
                    <div className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                             <Pie
                               data={getCategoryData()}
                               cx="50%"
                               cy="50%"
                               innerRadius={60}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="value"
                             >
                               {getCategoryData().map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || '#94A3B8'} />
                               ))}
                             </Pie>
                             <Tooltip 
                               contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                               formatter={(value: number) => [`${value.toLocaleString()} đ`, '']}
                             />
                             <Legend 
                                verticalAlign="middle" 
                                align="right" 
                                layout="vertical" 
                                iconType="circle"
                                wrapperStyle={{ fontSize: '12px' }}
                             />
                          </RePieChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
              </div>
           )}

           {viewMode === 'assets' && (
               <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                   <div className="flex justify-between items-center">
                       <h3 className="text-lg font-bold text-white">Danh sách Tài khoản / Tài sản</h3>
                       <button onClick={() => {
                           setEditingAccountId(null);
                           setTempAccountName('');
                           setTempAccountBalance('');
                           setShowAccountModal(true);
                       }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                           <Plus size={16}/> Thêm mới
                       </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {accounts.map(acc => (
                           <div key={acc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative group hover:border-blue-500/50 transition">
                               <div className="flex justify-between items-start mb-3">
                                   <div className="flex items-center gap-3">
                                       <div className={`p-2 rounded-lg bg-slate-800`} style={{ color: acc.color }}>
                                           {getAccountIcon(acc.type)}
                                       </div>
                                       <div>
                                           <div className="text-white font-medium">{acc.name}</div>
                                           <div className="text-xs text-slate-500 capitalize">{acc.type === 'cash' ? 'Tiền mặt' : acc.type === 'bank' ? 'Ngân hàng' : acc.type === 'investment' ? 'Đầu tư' : 'Khác'}</div>
                                       </div>
                                   </div>
                                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                       <button onClick={() => openEditAccount(acc)} className="p-1.5 hover:bg-slate-800 rounded text-blue-400"><Edit2 size={14}/></button>
                                       <button onClick={() => handleDeleteAccount(acc.id)} className="p-1.5 hover:bg-slate-800 rounded text-red-400"><Trash2 size={14}/></button>
                                   </div>
                               </div>
                               <div className="text-2xl font-bold text-white tracking-tight">
                                   {acc.balance.toLocaleString()} <span className="text-xs text-slate-500 font-normal">đ</span>
                               </div>
                           </div>
                       ))}
                       
                       {accounts.length === 0 && (
                           <div className="col-span-full py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                               Chưa có tài khoản nào. Hãy thêm tài khoản để bắt đầu theo dõi.
                           </div>
                       )}
                   </div>
               </div>
           )}

           {viewMode === 'calendar' && (
              <div className="animate-in fade-in slide-in-from-bottom-4">
                 {renderCalendar()}
              </div>
           )}

           {viewMode === 'list' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-950/50 border-b border-slate-800 text-xs text-slate-400 uppercase">
                             <th className="p-4 font-medium">Ngày</th>
                             <th className="p-4 font-medium">Loại</th>
                             <th className="p-4 font-medium">Nguồn</th>
                             <th className="p-4 font-medium">Danh mục</th>
                             <th className="p-4 font-medium">Mô tả</th>
                             <th className="p-4 font-medium text-right">Số tiền</th>
                             <th className="p-4 font-medium text-right"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800">
                          {transactions.length === 0 ? (
                             <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-500">Chưa có giao dịch nào</td>
                             </tr>
                          ) : (
                             transactions.map(t => (
                                <tr key={t.id} className="hover:bg-slate-800/50 transition">
                                   <td className="p-4 text-sm text-slate-300">{t.date}</td>
                                   <td className="p-4">
                                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${t.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                          {t.type === 'income' ? 'Thu' : 'Chi'}
                                      </span>
                                   </td>
                                   <td className="p-4 text-sm text-slate-400">
                                       {accounts.find(a => a.id === t.accountId)?.name || 'Unknown'}
                                   </td>
                                   <td className="p-4">
                                      <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700" style={{ color: CATEGORY_COLORS[t.category] }}>
                                         {t.category}
                                      </span>
                                   </td>
                                   <td className="p-4 text-sm text-white">{t.description}</td>
                                   <td className={`p-4 text-right font-medium ${t.type === 'income' ? 'text-green-400' : 'text-white'}`}>
                                       {t.type === 'income' ? '+' : ''}{t.amount.toLocaleString()} đ
                                   </td>
                                   <td className="p-4 text-right">
                                      <button onClick={() => handleDeleteTx(t.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition">
                                         <Trash2 size={16}/>
                                      </button>
                                   </td>
                                </tr>
                             ))
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Budget Modal */}
      {showBudgetModal && (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
               <h3 className="text-lg font-bold text-white mb-4">Thiết lập ngân sách tháng</h3>
               <div className="mb-4">
                  <label className="text-xs text-slate-400 mb-1 block">Giới hạn chi tiêu (VNĐ)</label>
                  <input 
                     type="text" 
                     autoFocus
                     value={tempBudgetLimit}
                     onChange={(e) => setTempBudgetLimit(e.target.value)}
                     placeholder="Ví dụ: 5000000"
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
               </div>
               <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowBudgetModal(false)} className="px-4 py-2 text-slate-400 hover:text-white transition text-sm">Hủy</button>
                  <button onClick={handleSaveBudget} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm">Lưu</button>
               </div>
            </div>
         </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
               <h3 className="text-lg font-bold text-white mb-4">{editingAccountId ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}</h3>
               <div className="space-y-4 mb-6">
                  <div>
                      <label className="text-xs text-slate-400 mb-1 block">Tên tài khoản</label>
                      <input 
                         type="text" 
                         value={tempAccountName}
                         onChange={(e) => setTempAccountName(e.target.value)}
                         placeholder="VD: Vietcombank, Ví tiền..."
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                  </div>
                  <div>
                      <label className="text-xs text-slate-400 mb-1 block">Loại tài khoản</label>
                      <select 
                        value={tempAccountType}
                        onChange={(e) => setTempAccountType(e.target.value as AccountType)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      >
                          <option value="bank">Ngân hàng</option>
                          <option value="cash">Tiền mặt</option>
                          <option value="investment">Đầu tư</option>
                          <option value="saving">Tiết kiệm</option>
                          <option value="other">Khác</option>
                      </select>
                  </div>
                  <div>
                      <label className="text-xs text-slate-400 mb-1 block">Số dư hiện tại (VNĐ)</label>
                      <input 
                         type="text" 
                         value={tempAccountBalance}
                         onChange={(e) => setTempAccountBalance(e.target.value)}
                         placeholder="0"
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                      {tempAccountType === 'investment' && (
                          <p className="text-[10px] text-slate-500 mt-1">
                              *Với tài khoản đầu tư, bạn có thể cập nhật số dư thủ công tại đây để khớp với giá trị thị trường.
                          </p>
                      )}
                  </div>
               </div>
               <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowAccountModal(false)} className="px-4 py-2 text-slate-400 hover:text-white transition text-sm">Hủy</button>
                  <button onClick={handleSaveAccount} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm">Lưu</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default FinanceManager;