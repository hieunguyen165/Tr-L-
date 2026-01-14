import React, { useState, useEffect, useRef } from 'react';
import { BarChart2, TrendingUp, Users, Clock, Activity, Zap, Lock, RefreshCw, ChevronDown, Layout, PlusCircle, LogOut, Check, Settings, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import * as geminiService from '../services/gemini';
import { AnalyticsData, AnalyticsReport, Project, GA4AccountSummary, GA4PropertySummary, GoogleUserInfo } from '../types';

declare const google: any;

interface AnalyticsReporterProps {
  projects: Project[];
}

const AnalyticsReporter: React.FC<AnalyticsReporterProps> = ({ projects }) => {
  // Config State
  const [clientId, setClientId] = useState(localStorage.getItem('ga_client_id') || '');
  const [showConfig, setShowConfig] = useState(!localStorage.getItem('ga_client_id'));

  // Auth State
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Data State
  const [properties, setProperties] = useState<GA4PropertySummary[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  
  const [loadingReport, setLoadingReport] = useState(false);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services
  useEffect(() => {
    if (clientId && typeof google !== 'undefined') {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: (tokenResponse: any) => {
            if (tokenResponse.access_token) {
              setAccessToken(tokenResponse.access_token);
              setIsConnecting(false);
              fetchUserInfo(tokenResponse.access_token);
              fetchGAProperties(tokenResponse.access_token);
            }
          },
        });
        setTokenClient(client);
      } catch (e) {
        console.error("Error initializing Google Token Client", e);
      }
    }
  }, [clientId]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Data when property selected
  useEffect(() => {
    if (selectedPropertyId && accessToken) {
      fetchAnalyticsData(selectedPropertyId, accessToken);
    }
  }, [selectedPropertyId, accessToken]);

  const saveConfig = () => {
    if (clientId.trim()) {
      localStorage.setItem('ga_client_id', clientId.trim());
      setShowConfig(false);
      window.location.reload(); // Reload to re-init Google Client
    }
  };

  const handleLogin = () => {
    if (tokenClient) {
      setIsConnecting(true);
      // Request access token. Prompt user to select account.
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      alert("Chưa cấu hình Client ID hoặc Google Library chưa tải xong.");
    }
  };

  const handleSwitchAccount = () => {
    handleLogin(); // Triggers the consent screen again to choose another account
    setIsAccountMenuOpen(false);
  };

  const handleLogout = () => {
    const token = accessToken;
    if (token && typeof google !== 'undefined') {
      google.accounts.oauth2.revoke(token, () => {
        setAccessToken(null);
        setUserInfo(null);
        setProperties([]);
        setData(null);
        setReport(null);
      });
    } else {
      setAccessToken(null);
      setUserInfo(null);
    }
    setIsAccountMenuOpen(false);
  };

  // --- API CALLS ---

  const fetchUserInfo = async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const info = await res.json();
      setUserInfo(info);
    } catch (e) {
      console.error("Failed to fetch user info", e);
    }
  };

  const fetchGAProperties = async (token: string) => {
    try {
      // List Account Summaries which contains properties
      const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const allProps: GA4PropertySummary[] = [];
      if (data.accountSummaries) {
        data.accountSummaries.forEach((acc: GA4AccountSummary) => {
          if (acc.propertySummaries) {
            allProps.push(...acc.propertySummaries);
          }
        });
      }
      setProperties(allProps);
      if (allProps.length > 0) {
        setSelectedPropertyId(allProps[0].property.split('/')[1]); // properties/123 -> 123
      }
    } catch (e) {
      console.error("Failed to fetch GA properties", e);
      alert("Lỗi tải danh sách Website từ Google Analytics.");
    }
  };

  const fetchAnalyticsData = async (propertyId: string, token: string) => {
    setLoadingData(true);
    setReport(null);
    try {
      // Fetch Report for last 7 days
      const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'yesterday' }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' }
          ],
          orderBys: [{ dimension: { orderType: 'ALPHANUMERIC', dimensionName: 'date' } }]
        })
      });

      const responseData = await res.json();

      if (!responseData.rows) {
        setData(null);
        return;
      }

      // Map API response to our App's Data Structure
      const chartData = responseData.rows.map((row: any) => {
        // Date format YYYYMMDD -> DD/MM
        const d = row.dimensionValues[0].value;
        const formattedDate = `${d.substring(6, 8)}/${d.substring(4, 6)}`;
        return {
          date: formattedDate,
          users: parseInt(row.metricValues[0].value),
          sessions: parseInt(row.metricValues[1].value)
        };
      });

      // Calculate totals/averages from the metric headers or aggregate rows
      // Ideally we make a separate call for totals, but aggregating rows is okay for charts
      const totalUsers = chartData.reduce((acc: number, cur: any) => acc + cur.users, 0);
      const totalSessions = chartData.reduce((acc: number, cur: any) => acc + cur.sessions, 0);
      
      // Calculate weighted averages or just take the average of rows (simplified)
      const avgBounceRate = responseData.rows.reduce((acc: number, cur: any) => acc + parseFloat(cur.metricValues[2].value), 0) / responseData.rows.length;
      const avgDurationSec = responseData.rows.reduce((acc: number, cur: any) => acc + parseFloat(cur.metricValues[3].value), 0) / responseData.rows.length;

      // Format duration seconds to MM:SS
      const min = Math.floor(avgDurationSec / 60);
      const sec = Math.floor(avgDurationSec % 60);
      const durationStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

      setData({
        users: totalUsers,
        sessions: totalSessions,
        bounceRate: parseFloat((avgBounceRate * 100).toFixed(1)), // API returns 0.45, we need 45%
        avgSessionDuration: durationStr,
        chartData
      });

    } catch (e) {
      console.error("Failed to fetch analytics report", e);
      alert("Lỗi tải dữ liệu báo cáo.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!data) return;
    setLoadingReport(true);
    try {
      const result = await geminiService.analyzeAnalyticsData(data);
      setReport(result);
    } catch (e) {
      console.error(e);
      alert('Không thể tạo báo cáo AI lúc này.');
    } finally {
      setLoadingReport(false);
    }
  };

  // --- RENDER ---

  if (showConfig) {
    return (
       <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950">
         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
               <Settings size={20} className="text-blue-500" /> Cấu hình Google Cloud
            </h2>
            <p className="text-sm text-slate-400 mb-4">
               Để kết nối Google Analytics thực tế, bạn cần nhập <strong>Client ID</strong> từ Google Cloud Console của bạn.
            </p>
            <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-lg mb-4 text-xs text-yellow-200">
               <AlertTriangle size={12} className="inline mr-1"/>
               Cần thêm <code>{window.location.origin}</code> vào "Authorized JavaScript origins" trong Cloud Console.
            </div>
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Google Client ID</label>
                  <input 
                     type="text" 
                     value={clientId}
                     onChange={(e) => setClientId(e.target.value)}
                     placeholder="xxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
               </div>
               <button 
                  onClick={saveConfig}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition"
               >
                  Lưu & Khởi tạo
               </button>
            </div>
         </div>
       </div>
    );
  }

  // LOGIN SCREEN
  if (!accessToken) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950 relative">
        <button 
           onClick={() => setShowConfig(true)}
           className="absolute top-4 right-4 text-slate-500 hover:text-white"
           title="Cấu hình Client ID"
        >
           <Settings size={20} />
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <BarChart2 size={40} className="text-orange-500" />
            <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5 border-4 border-slate-900">
               <Zap size={12} className="text-white"/>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Google Analytics (Real Data)</h2>
          <p className="text-slate-400 mb-8">
            Đăng nhập tài khoản Google để xem dữ liệu thực tế từ các Website Property của bạn.
          </p>
          
          <button
            onClick={handleLogin}
            disabled={isConnecting}
            className="w-full py-3 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-lg transition flex items-center justify-center gap-3"
          >
            {isConnecting ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335" />
              </svg>
            )}
            {isConnecting ? 'Đang kết nối...' : 'Đăng nhập Google'}
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Lock size={12} /> Dữ liệu lấy trực tiếp từ API Google
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-slate-950">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="text-orange-500" /> Báo cáo Analytics AI
          </h2>
          <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 text-sm">Dữ liệu 7 ngày qua</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            
            {/* Account Switcher */}
            {userInfo && (
                <div className="relative" ref={accountMenuRef}>
                    <button 
                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                        className="flex items-center gap-3 bg-slate-900 border border-slate-700 hover:border-slate-600 pl-2 pr-4 py-1.5 rounded-full transition"
                    >
                        <img src={userInfo.picture} alt="Avatar" className="w-8 h-8 rounded-full bg-slate-800" />
                        <div className="text-left hidden md:block">
                            <div className="text-xs font-bold text-white">{userInfo.name}</div>
                            <div className="text-[10px] text-slate-400 max-w-[120px] truncate">{userInfo.email}</div>
                        </div>
                        <ChevronDown size={14} className="text-slate-500" />
                    </button>

                    {/* Dropdown Menu */}
                    {isAccountMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                             <div className="p-3 border-b border-slate-800">
                                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tài khoản hiện tại</span>
                             </div>
                             <div className="p-3 flex items-center gap-3 bg-slate-800/50">
                                  <img src={userInfo.picture} className="w-8 h-8 rounded-full" alt="avt" />
                                  <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-blue-400 truncate">{userInfo.name}</div>
                                      <div className="text-xs text-slate-500 truncate">{userInfo.email}</div>
                                  </div>
                                  <Check size={14} className="text-blue-500"/>
                             </div>
                             <div className="p-2 border-t border-slate-800 bg-slate-900 space-y-1">
                                 <button 
                                    onClick={handleSwitchAccount}
                                    className="w-full flex items-center gap-2 p-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                 >
                                     <PlusCircle size={14}/>
                                     Đổi / Thêm tài khoản
                                 </button>
                                 <button 
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 p-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition"
                                 >
                                     <LogOut size={14}/>
                                     Đăng xuất
                                 </button>
                             </div>
                        </div>
                    )}
                </div>
            )}

            <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

            {/* Property Selector */}
            <div className="relative w-full sm:w-auto">
                <select 
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full sm:w-auto appearance-none bg-slate-900 border border-slate-700 text-white pl-10 pr-10 py-2.5 rounded-lg font-medium focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer min-w-[240px] max-w-[300px]"
                >
                    {properties.length === 0 ? (
                        <option value="" disabled>-- Không có GA4 Property --</option>
                    ) : (
                        properties.map(p => {
                           const id = p.property.split('/')[1];
                           return <option key={id} value={id}>{p.displayName}</option>;
                        })
                    )}
                </select>
                <Layout className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
            </div>

            <button 
                onClick={handleGenerateReport}
                disabled={loadingReport || !data || loadingData}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
                {loadingReport ? <RefreshCw className="animate-spin" size={18}/> : <Zap size={18}/>}
                {loadingReport ? 'AI Đang đọc...' : 'Phân tích & Đề xuất'}
            </button>
        </div>
      </div>

      {properties.length === 0 ? (
           <div className="border border-dashed border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
              <Layout className="text-slate-600 mb-4" size={48} />
              <h3 className="text-lg font-medium text-white mb-2">Không tìm thấy dữ liệu</h3>
              <p className="text-slate-400">Tài khoản này chưa có Google Analytics 4 Property nào.</p>
          </div>
      ) : loadingData || !data ? (
          <div className="h-64 flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin text-orange-500 mb-4" size={32}/>
              <p className="text-slate-400">Đang tải dữ liệu từ Google Analytics...</p>
          </div>
      ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Users size={16}/> Người dùng</div>
                    <div className="text-2xl font-bold text-white">{data.users.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Activity size={16}/> Phiên</div>
                    <div className="text-2xl font-bold text-white">{data.sessions.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><TrendingUp size={16}/> Tỷ lệ thoát</div>
                    <div className="text-2xl font-bold text-white">{data.bounceRate}%</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2"><Clock size={16}/> Thời gian TB</div>
                    <div className="text-2xl font-bold text-white">{data.avgSessionDuration}</div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Lưu lượng truy cập (7 ngày)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.chartData}>
                            <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                            />
                            <Area type="monotone" dataKey="users" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Report Section */}
                <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 p-6 rounded-xl relative overflow-hidden">
                    {!report ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <Zap size={48} className="text-blue-500 mb-4" />
                            <p className="text-slate-300">Nhấn nút "Phân tích & Đề xuất" để AI đọc số liệu và tìm ra insight ẩn.</p>
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto custom-scrollbar">
                            <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${report.sentiment === 'positive' ? 'text-green-400' : report.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'}`}>
                                Đánh giá tổng quan: {report.sentiment}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-3">Tóm tắt</h3>
                            <p className="text-sm text-slate-300 mb-4 leading-relaxed">{report.summary}</p>
                            
                            <h4 className="text-sm font-bold text-blue-400 mb-2">Insight chính</h4>
                            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1 mb-4">
                                {report.key_insights.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>

                            <h4 className="text-sm font-bold text-orange-400 mb-2">Đề xuất hành động</h4>
                            <ul className="space-y-2">
                                {report.recommendations.map((item, i) => (
                                    <li key={i} className="text-xs text-slate-200 bg-slate-800/50 p-2 rounded border border-slate-700">
                                        💡 {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-6">Users & Sessions</h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.chartData} margin={{ left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }} />
                            <Bar dataKey="users" name="Users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="sessions" name="Sessions" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
          </>
      )}
    </div>
  );
};

export default AnalyticsReporter;