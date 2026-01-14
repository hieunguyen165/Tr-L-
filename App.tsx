import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Search, Trash2, TrendingUp, AlertCircle, Globe, Folder, ArrowLeft, FolderPlus, ExternalLink, LayoutDashboard, PenTool, Menu, X, Image as ImageIcon, Shirt, MapPin, BarChart2, AlertTriangle, LogOut } from 'lucide-react';
import { KeywordTrack, RankHistoryItem, Project } from './types';
import * as storageService from './services/storage';
import * as geminiService from './services/gemini';
import AddKeywordModal from './components/AddKeywordModal';
import AddProjectModal from './components/AddProjectModal';
import SeoWriter from './components/SeoWriter';
import ImageGenerator from './components/ImageGenerator';
import FashionGenerator from './components/FashionGenerator';
import CheckinGenerator from './components/CheckinGenerator';
import AnalyticsReporter from './components/AnalyticsReporter';
import RankChart from './components/RankChart';
import Login from './components/Login';

type View = 'tracker' | 'writer' | 'image-gen' | 'fashion' | 'checkin' | 'analytics';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Navigation State
  const [currentView, setCurrentView] = useState<View>('tracker');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // For mobile/desktop toggle

  // Rank Tracker State
  const [projects, setProjects] = useState<Project[]>([]);
  const [keywords, setKeywords] = useState<KeywordTrack[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  const [filterText, setFilterText] = useState('');
  const [globalLoading, setGlobalLoading] = useState(false);
  
  const hasAutoCheckedRef = useRef(false);
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(false);

  // Load initial data
  useEffect(() => {
    // Check Auth
    const storedAuth = localStorage.getItem('app_is_authenticated');
    if (storedAuth === 'true') {
      setIsAuthenticated(true);
    }

    // Check if API KEY is present
    if (!process.env.API_KEY) {
      setIsApiKeyMissing(true);
    }

    const loadedProjects = storageService.loadProjects();
    const loadedKeywords = storageService.loadKeywords();
    setProjects(loadedProjects);
    setKeywords(loadedKeywords);

    // Global Auto-check (checks stale keywords across ALL projects)
    if (!hasAutoCheckedRef.current) {
      hasAutoCheckedRef.current = true;
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      
      const staleKeywords = loadedKeywords.filter(k => {
        if (!k.lastChecked) return false;
        return (now - k.lastChecked) > ONE_DAY;
      });

      if (staleKeywords.length > 0) {
        // Silent update could be implemented here
        // For now, we skip auto-run to keep UI simple
      }
    }
    
    // Auto-close sidebar on mobile on init
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Auth Handlers
  const handleLoginSuccess = () => {
    localStorage.setItem('app_is_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('app_is_authenticated');
    setIsAuthenticated(false);
    // Reset view states if needed
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
    setKeywords(prev => prev.map(k => idsToCheck.includes(k.id) ? { ...k, isUpdating: true } : k));

    for (const id of idsToCheck) {
      const currentAllKeywords = storageService.loadKeywords();
      const item = currentAllKeywords.find(k => k.id === id);
      
      if (item) {
        const updatedItem = await performCheck(item);
        
        // Update storage
        const newList = storageService.loadKeywords().map(k => k.id === id ? updatedItem : k);
        storageService.saveKeywords(newList);
        
        // Update State
        setKeywords(prev => prev.map(k => k.id === id ? updatedItem : k));
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setGlobalLoading(false);
  }, [isApiKeyMissing]);


  // --- HANDLERS (Rank Tracker) ---

  const handleAddProject = (name: string, domain: string) => {
    const newProject = storageService.createNewProject(name, domain);
    const updatedProjects = [newProject, ...projects];
    setProjects(updatedProjects);
    storageService.saveProjects(updatedProjects);
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Bạn có chắc muốn xóa dự án này? Tất cả từ khóa bên trong sẽ bị xóa.')) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      storageService.saveProjects(updatedProjects);

      const updatedKeywords = keywords.filter(k => k.projectId !== projectId);
      setKeywords(updatedKeywords);
      storageService.saveKeywords(updatedKeywords);
      
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
      }
    }
  };

  const handleAddKeyword = (keywordList: string[], domain: string) => {
    if (!activeProjectId) return;

    const newItems = keywordList.map(kw => 
      storageService.createNewKeyword(kw, domain, activeProjectId)
    );
    
    const updatedKeywords = [...newItems, ...keywords];
    setKeywords(updatedKeywords);
    storageService.saveKeywords(updatedKeywords);
    
    processBatch(newItems.map(item => item.id));
  };

  const handleDeleteKeyword = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa từ khóa này?')) {
      const updated = keywords.filter(k => k.id !== id);
      setKeywords(updated);
      storageService.saveKeywords(updated);
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
      </nav>
      
      <div className="p-4 border-t border-slate-800 shrink-0">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/10 hover:text-red-300 transition"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
        <div className="bg-slate-800 rounded-lg p-3 mt-3 border border-slate-700">
           <div className="text-xs text-slate-500 mb-1">Dự án đang theo dõi</div>
           <div className="text-xl font-bold text-white">{projects.length}</div>
        </div>
      </div>
    </div>
  );

  const renderTrackerContent = () => (
    <>
      {/* Header specific to Tracker */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-400" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            {activeProjectId && (
              <button 
                onClick={() => setActiveProjectId(null)}
                className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-white hidden sm:block">
              {activeProjectId ? activeProject?.name : 'Tổng quan dự án'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {!activeProjectId ? (
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-900/20"
              >
                <FolderPlus size={18} />
                <span className="hidden sm:inline">Dự án mới</span>
              </button>
            ) : (
              <>
                 <button
                  onClick={handleCheckAllInProject}
                  disabled={globalLoading || currentProjectKeywords.length === 0}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition border border-slate-700 ${globalLoading || currentProjectKeywords.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RefreshCw size={16} className={globalLoading ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Kiểm tra</span>
                </button>
                <button
                  onClick={() => setIsKeywordModalOpen(true)}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-900/20"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Từ khóa</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Tracker Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* API KEY WARNING BANNER */}
        {isApiKeyMissing && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-4 animate-pulse">
             <div className="bg-red-900/50 p-2 rounded-full text-red-500 shrink-0">
                <AlertTriangle size={24} />
             </div>
             <div>
                <h3 className="font-bold text-red-400 mb-1">Chưa cấu hình API Key</h3>
                <p className="text-sm text-red-200/80 mb-2">
                   Ứng dụng không tìm thấy <code>GEMINI_API_KEY</code>. Các tính năng AI sẽ không hoạt động.
                </p>
                <div className="text-xs text-red-200/60 bg-red-950/50 p-2 rounded font-mono">
                   Vào Netlify &gt; Site Settings &gt; Environment variables &gt; Thêm Key: <code>API_KEY</code>
                </div>
             </div>
          </div>
        )}

        {!activeProjectId && (
          <>
             {projects.length === 0 ? (
              <div className="text-center py-20 bg-slate-800/50 rounded-3xl border border-dashed border-slate-700">
                <div className="inline-block p-4 bg-slate-800 rounded-full mb-4">
                  <Folder size={32} className="text-slate-500" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Chưa có dự án nào</h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto">Tạo dự án để bắt đầu quản lý và theo dõi thứ hạng từ khóa.</p>
                <button onClick={() => setIsProjectModalOpen(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition">Tạo dự án ngay</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => {
                  const projectKeywords = keywords.filter(k => k.projectId === project.id);
                  const top3 = projectKeywords.filter(k => k.currentRank > 0 && k.currentRank <= 3).length;
                  return (
                    <div key={project.id} onClick={() => setActiveProjectId(project.id)} className="bg-slate-800 border border-slate-700 rounded-xl p-6 cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/10 transition group relative">
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-1" title="Xóa dự án"><Trash2 size={16} /></button>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-slate-700/50 p-3 rounded-lg text-blue-400"><Folder size={24} /></div>
                        <div>
                          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">{project.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-400"><Globe size={10} />{project.domain}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                        <div><div className="text-xs text-slate-500 mb-1">Từ khóa</div><div className="text-xl font-semibold text-white">{projectKeywords.length}</div></div>
                        <div><div className="text-xs text-slate-500 mb-1">Top 3</div><div className="text-xl font-semibold text-green-400">{top3}</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* --- DETAIL VIEW: KEYWORD LIST --- */}
        {activeProjectId && (
          <div className="space-y-6">
            
            {/* Search/Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm từ khóa..." 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Keywords Table/List */}
            {currentProjectKeywords.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                <p className="text-slate-400 mb-4">{filterText ? 'Không tìm thấy từ khóa nào.' : 'Dự án này chưa có từ khóa.'}</p>
                {!filterText && (
                  <button onClick={() => setIsKeywordModalOpen(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition border border-slate-700">Thêm từ khóa ngay</button>
                )}
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                 <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/50 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider">
                        <th className="p-4 font-medium">Từ khóa</th>
                        <th className="p-4 font-medium text-center">Thứ hạng</th>
                        <th className="p-4 font-medium text-center">Thay đổi</th>
                        <th className="p-4 font-medium min-w-[300px]">Lịch sử (30 ngày)</th>
                        <th className="p-4 font-medium text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {currentProjectKeywords.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-700/30 transition group">
                          <td className="p-4">
                            <div className="font-medium text-white">{item.keyword}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{item.domain}</div>
                            {item.lastError && (
                              <div className="flex items-center gap-1 text-xs text-red-400 mt-1">
                                <AlertCircle size={10} /> {item.lastError}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {item.isUpdating ? (
                              <RefreshCw size={20} className="animate-spin text-blue-500 mx-auto" />
                            ) : (
                              <div className={`text-2xl font-bold ${getRankColor(item.currentRank)}`}>
                                {item.currentRank > 0 ? item.currentRank : '-'}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 mt-1">
                              {item.lastChecked ? new Date(item.lastChecked).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'}) : 'Chưa check'}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {getRankChange(item.history)}
                          </td>
                          <td className="p-4">
                            <div className="h-12 w-full">
                              {item.history.length > 0 && (
                                <RankChart history={item.history} />
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                               <button 
                                onClick={() => processBatch([item.id])}
                                disabled={item.isUpdating}
                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                                title="Kiểm tra lại"
                              >
                                <RefreshCw size={16} className={item.isUpdating ? 'animate-spin' : ''} />
                              </button>
                              <button 
                                onClick={() => handleDeleteKeyword(item.id)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                title="Xóa"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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
    </>
  );

  // If NOT authenticated, show Login Screen
  if (!isAuthenticated) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  // If Authenticated, show Main App
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans text-slate-200">
      {renderSidebar()}
      
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        {currentView === 'tracker' && renderTrackerContent()}
        {currentView === 'writer' && <SeoWriter />}
        {currentView === 'image-gen' && <ImageGenerator />}
        {currentView === 'fashion' && <FashionGenerator />}
        {currentView === 'checkin' && <CheckinGenerator />}
        {currentView === 'analytics' && <AnalyticsReporter projects={projects} />}
      </div>
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;