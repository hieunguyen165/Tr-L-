import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Search, Trash2, TrendingUp, AlertCircle, Globe, Folder, FolderPlus, LayoutDashboard, PenTool, Menu, X, Image as ImageIcon, Shirt, MapPin, BarChart2, LogOut, Users, Clock, Wallet, Database } from 'lucide-react';
import { KeywordTrack, RankHistoryItem, Project, User } from './types';
import * as storageService from './services/storage';
import * as geminiService from './services/gemini';
import { auth } from './services/firebase';
import AddKeywordModal from './components/AddKeywordModal';
import AddProjectModal from './components/AddProjectModal';
import SeoWriter from './components/SeoWriter';
import ImageGenerator from './components/ImageGenerator';
import FashionGenerator from './components/FashionGenerator';
import CheckinGenerator from './components/CheckinGenerator';
import AnalyticsReporter from './components/AnalyticsReporter';
import RankChart from './components/RankChart';
import Login from './components/Login';
import MemberManager from './components/MemberManager';
import FinanceManager from './components/FinanceManager';
import DataSettings from './components/DataSettings';

type View = 'tracker' | 'writer' | 'image-gen' | 'fashion' | 'checkin' | 'analytics' | 'members' | 'finance' | 'data-settings';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Navigation State
  const [currentView, setCurrentView] = useState<View>('tracker');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Rank Tracker State
  const [projects, setProjects] = useState<Project[]>([]);
  const [keywords, setKeywords] = useState<KeywordTrack[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  const [filterText, setFilterText] = useState('');
  const [globalLoading, setGlobalLoading] = useState(false);
  
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  // Initialize Auth & Data Listeners
  useEffect(() => {
    // Listen for Firebase Auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
            const user: User = {
                id: firebaseUser.uid,
                username: firebaseUser.email || '',
                password: '',
                fullName: firebaseUser.displayName || 'User',
                role: 'member', // Could fetch custom claims if needed
                createdAt: Date.now()
            };
            setCurrentUser(user);
            
            // Try to migrate data if first time
            await storageService.migrateLocalDataToFirebase();

        } else {
            setCurrentUser(null);
            setProjects([]);
            setKeywords([]);
        }
    });

    if (!process.env.API_KEY) {
      setIsApiKeyMissing(true);
    }

    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    return () => unsubscribeAuth();
  }, []);

  // Listen for Data Changes when User is logged in
  useEffect(() => {
      if (!currentUser) return;

      const unsubProjects = storageService.listenToProjects((data) => {
          setProjects(data);
          // If active project is deleted or not set, select first
          if (data.length > 0 && !activeProjectId) {
            // Optional: don't auto select to keep empty state
          }
      });

      const unsubKeywords = storageService.listenToKeywords((data) => {
          setKeywords(data);
      });

      return () => {
          unsubProjects();
          unsubKeywords();
      };
  }, [currentUser, activeProjectId]);


  const handleLoginSuccess = (user: User) => {
     // Handled by onAuthStateChanged, but kept for interface compatibility
  };

  const handleLogout = () => {
    auth.signOut();
    setCurrentView('tracker');
    setActiveProjectId(null);
  };

  // --- CORE LOGIC (Rank Tracker) ---

  const performCheck = async (item: KeywordTrack): Promise<KeywordTrack> => {
    try {
      if (isApiKeyMissing) {
         return {
          ...item,
          isUpdating: false,
          lastError: 'Thiếu API Key'
        };
      }

      const result = await geminiService.checkKeywordRank(item.keyword, item.domain);
      
      const newHistoryItem: RankHistoryItem = {
        date: new Date().toISOString(),
        rank: result.rank,
        timestamp: Date.now()
      };

      const updatedHistory = [...item.history, newHistoryItem].slice(-30);

      return {
        ...item,
        currentRank: result.rank,
        lastChecked: Date.now(),
        history: updatedHistory,
        isUpdating: false,
        lastError: undefined
      };
    } catch (error) {
      return {
        ...item,
        isUpdating: false,
        lastError: 'Lỗi kiểm tra'
      };
    }
  };

  const processBatch = useCallback(async (idsToCheck: string[]) => {
    if (idsToCheck.length === 0) return;
    
    setGlobalLoading(true);
    
    // Optimistic UI Update: Set loading state
    setKeywords(prev => prev.map(k => idsToCheck.includes(k.id) ? { ...k, isUpdating: true } : k));

    for (const id of idsToCheck) {
      const item = keywords.find(k => k.id === id);
      
      if (item) {
        const updatedItem = await performCheck(item);
        // Save to Firestore
        const { id: itemId, ...data } = updatedItem;
        await storageService.updateKeyword(itemId, data);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setGlobalLoading(false);
  }, [keywords, isApiKeyMissing]);


  // --- HANDLERS (Rank Tracker) ---

  const handleAddProject = (name: string, domain: string) => {
    storageService.addProject(name, domain);
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Bạn có chắc muốn xóa dự án này? Tất cả từ khóa bên trong sẽ bị xóa vĩnh viễn.')) {
        storageService.deleteProject(projectId);
        if (activeProjectId === projectId) setActiveProjectId(null);
    }
  };

  const handleAddKeyword = (keywordList: string[], domain: string) => {
    if (!activeProjectId) return;

    // Add individually to Firestore
    keywordList.forEach(kw => {
        storageService.addKeyword(kw, domain, activeProjectId);
    });
    // Trigger check not implemented immediately to save quota, user can click check all
  };

  const handleDeleteKeyword = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa từ khóa này?')) {
        storageService.deleteKeyword(id);
    }
  };

  // View Helpers
  const activeProject = projects.find(p => p.id === activeProjectId);
  
  const currentProjectKeywords = keywords.filter(k => 
    k.projectId === activeProjectId &&
    (k.keyword.toLowerCase().includes(filterText.toLowerCase()) || 
     k.domain.toLowerCase().includes(filterText.toLowerCase()))
  );

  const handleCheckAllInProject = () => {
    const ids = currentProjectKeywords.map(k => k.id);
    processBatch(ids);
  };

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-slate-500';
    if (rank <= 3) return 'text-green-400';
    if (rank <= 10) return 'text-blue-400';
    return 'text-yellow-400';
  };

  const getRankChange = (history: RankHistoryItem[]) => {
    if (history.length < 2) return null;
    const current = history[history.length - 1].rank;
    const prev = history[history.length - 2].rank;
    if (current === 0 || prev === 0) return null; 
    const diff = prev - current;
    if (diff > 0) return <span className="text-green-400 text-xs flex items-center">▲ {diff}</span>;
    if (diff < 0) return <span className="text-red-400 text-xs flex items-center">▼ {Math.abs(diff)}</span>;
    return <span className="text-slate-500 text-xs">-</span>;
  };

  // --- RENDER HELPERS ---

  const renderTrackerContent = () => (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-200">
      {/* Top Bar: Project Selector & Actions */}
      <div className="border-b border-slate-800 bg-slate-900/50 p-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-2 border ${
                  activeProjectId === p.id 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Folder size={16} />
                {p.name}
              </button>
            ))}
            <button
               onClick={() => setIsProjectModalOpen(true)}
               className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-2 bg-slate-800 border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-700"
            >
              <FolderPlus size={16} /> Thêm Dự Án
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!activeProjectId ? (
         <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
            <Folder size={64} className="mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">Chọn hoặc tạo dự án</h3>
            <p className="max-w-md text-center">Bắt đầu theo dõi thứ hạng từ khóa bằng cách chọn một dự án ở trên hoặc tạo mới.</p>
         </div>
      ) : (
         <div className="flex-1 flex flex-col min-h-0">
             {/* Toolbar */}
             <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="text" 
                      placeholder="Tìm từ khóa..." 
                      value={filterText}
                      onChange={e => setFilterText(e.target.value)}
                      className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                 </div>
                 <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button 
                       onClick={handleCheckAllInProject}
                       disabled={globalLoading}
                       className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2 transition disabled:opacity-50"
                    >
                       <RefreshCw size={16} className={globalLoading ? "animate-spin" : ""} />
                       Kiểm tra tất cả
                    </button>
                    <button 
                       onClick={() => setIsKeywordModalOpen(true)}
                       className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition shadow-lg shadow-blue-900/20"
                    >
                       <Plus size={16} />
                       Thêm Từ Khóa
                    </button>
                    <button 
                       onClick={() => activeProjectId && handleDeleteProject(activeProjectId)}
                       className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                       title="Xóa dự án"
                    >
                       <Trash2 size={18} />
                    </button>
                 </div>
             </div>
             
             {/* API Key Warning */}
             {isApiKeyMissing && (
                <div className="mx-4 mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-200 text-sm">
                   <AlertCircle size={18} className="shrink-0" />
                   <span>Chưa cấu hình API Key. Vui lòng thêm API Key vào file .env hoặc cấu hình hệ thống.</span>
                </div>
             )}

             {/* Keywords Table */}
             <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                 {currentProjectKeywords.length === 0 ? (
                    <div className="h-64 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500">
                       <Search size={48} className="mb-4 opacity-20" />
                       <p>Chưa có từ khóa nào trong dự án này.</p>
                       <button onClick={() => setIsKeywordModalOpen(true)} className="mt-2 text-blue-400 hover:underline">Thêm từ khóa ngay</button>
                    </div>
                 ) : (
                    <div className="space-y-4">
                       {currentProjectKeywords.map(keyword => (
                          <div key={keyword.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 transition hover:border-slate-700">
                             <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-bold text-white text-lg">{keyword.keyword}</h4>
                                      <a href={`https://${keyword.domain}`} target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1">
                                         <Globe size={12} /> {keyword.domain}
                                      </a>
                                   </div>
                                   <div className="flex items-center gap-3 text-xs text-slate-400">
                                      <span className="flex items-center gap-1"><Clock size={12} /> Cập nhật: {keyword.lastChecked ? new Date(keyword.lastChecked).toLocaleString('vi-VN') : 'Chưa kiểm tra'}</span>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <div className={`text-3xl font-black ${getRankColor(keyword.currentRank)}`}>
                                      {keyword.isUpdating ? (
                                         <RefreshCw className="animate-spin inline" size={24} />
                                      ) : (
                                         keyword.currentRank === 0 ? '-' : `#${keyword.currentRank}`
                                      )}
                                   </div>
                                   <div className="mt-1 flex justify-end">
                                      {getRankChange(keyword.history)}
                                   </div>
                                </div>
                             </div>
                             
                             {/* Chart */}
                             <div className="border-t border-slate-800 pt-4">
                                <RankChart history={keyword.history} />
                             </div>

                             <div className="flex justify-end gap-2 mt-4 border-t border-slate-800 pt-3">
                                <button 
                                   onClick={() => processBatch([keyword.id])}
                                   disabled={keyword.isUpdating}
                                   className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 hover:bg-blue-900/20 rounded transition"
                                >
                                   <RefreshCw size={12} className={keyword.isUpdating ? "animate-spin" : ""} /> Check lại
                                </button>
                                <button 
                                   onClick={() => handleDeleteKeyword(keyword.id)}
                                   className="text-xs font-medium text-slate-500 hover:text-red-400 flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded transition"
                                >
                                   <Trash2 size={12} /> Xóa
                                </button>
                             </div>
                             
                             {keyword.lastError && (
                                <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                                   <AlertCircle size={12} /> {keyword.lastError}
                                </div>
                             )}
                          </div>
                       ))}
                    </div>
                 )}
             </div>
         </div>
      )}

      {/* Modals */}
      <AddKeywordModal 
        isOpen={isKeywordModalOpen}
        onClose={() => setIsKeywordModalOpen(false)}
        onAdd={handleAddKeyword}
        initialDomain={activeProject?.domain}
      />
      
      <AddProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onAdd={handleAddProject}
      />
    </div>
  );

  const renderSidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static flex flex-col`}>
      <div className="flex items-center gap-2 p-6 border-b border-slate-800 h-16 shrink-0">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <TrendingUp size={20} className="text-white" />
        </div>
        <h1 className="text-lg font-bold text-white tracking-tight">
          RankTracker <span className="text-blue-500 font-light">AI</span>
        </h1>
        <button className="lg:hidden ml-auto text-slate-400" onClick={() => setIsSidebarOpen(false)}>
          <X size={24} />
        </button>
      </div>

      <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
        <button
          onClick={() => { setCurrentView('tracker'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            currentView === 'tracker' 
              ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard size={18} />
          Theo Dõi Thứ Hạng
        </button>

        <button
          onClick={() => { setCurrentView('writer'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            currentView === 'writer' 
              ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PenTool size={18} />
          Viết Bài SEO
        </button>

        <button
          onClick={() => { setCurrentView('image-gen'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            currentView === 'image-gen' 
              ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ImageIcon size={18} />
          Tạo Ảnh Bài SEO
        </button>

        <button
          onClick={() => { setCurrentView('fashion'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            currentView === 'fashion' 
              ? 'bg-pink-600/10 text-pink-400 border border-pink-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shirt size={18} />
          Ảnh Thời Trang
        </button>
        
        <button
          onClick={() => { setCurrentView('checkin'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            currentView === 'checkin' 
              ? 'bg-teal-600/10 text-teal-400 border border-teal-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MapPin size={18} />
          Tạo Ảnh Check-in
        </button>

        <button
          onClick={() => { setCurrentView('analytics'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            currentView === 'analytics' 
              ? 'bg-orange-600/10 text-orange-400 border border-orange-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart2 size={18} />
          Báo Cáo Analytics
        </button>
        
        <button
          onClick={() => { setCurrentView('finance'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            currentView === 'finance' 
              ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wallet size={18} />
          Quản Lý Chi Tiêu
        </button>
        
        <button
          onClick={() => { setCurrentView('data-settings'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
            currentView === 'data-settings' 
              ? 'bg-pink-600/10 text-pink-400 border border-pink-600/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Database size={18} />
          Dữ Liệu & Cài Đặt
        </button>

        {/* Admin Only Menu */}
        {currentUser?.role === 'admin' && (
          <div className="pt-4 mt-4 border-t border-slate-800">
             <div className="px-4 text-[10px] uppercase font-bold text-slate-500 mb-2">Admin</div>
             <button
              onClick={() => { setCurrentView('members'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition ${
                currentView === 'members' 
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users size={18} />
              Quản lý thành viên
            </button>
          </div>
        )}
      </nav>
      
      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                {currentUser?.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{currentUser?.fullName}</div>
                <div className="text-[10px] text-slate-400 capitalize">{currentUser?.role}</div>
            </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/10 hover:text-red-300 transition"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </div>
    </div>
  );

  // If NOT authenticated, show Login Screen
  if (!currentUser) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  // If Authenticated, show Main App
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans text-slate-200">
      {renderSidebar()}
      
      <div className="flex-1 flex flex-col h-screen bg-slate-950 relative">
        
        {/* Mobile Header */}
        <div className="lg:hidden shrink-0 h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-20">
            <div className="flex items-center gap-2 font-bold text-white text-lg">
               <div className="bg-blue-600 p-1.5 rounded-lg">
                 <TrendingUp size={18} className="text-white" />
               </div>
               <span>RankTracker AI</span>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
                <Menu size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto relative scroll-smooth">
            {currentView === 'tracker' && renderTrackerContent()}
            {currentView === 'writer' && <SeoWriter />}
            {currentView === 'image-gen' && <ImageGenerator />}
            {currentView === 'fashion' && <FashionGenerator />}
            {currentView === 'checkin' && <CheckinGenerator />}
            {currentView === 'analytics' && <AnalyticsReporter projects={projects} />}
            {currentView === 'finance' && <FinanceManager />}
            {currentView === 'data-settings' && <DataSettings />}
            {currentView === 'members' && currentUser.role === 'admin' && <MemberManager currentUser={currentUser} />}
        </div>

      </div>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;