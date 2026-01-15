import React, { useState, useEffect } from 'react';
import { Lock, LogIn, AlertCircle, Settings, HelpCircle, Save, X } from 'lucide-react';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType, remember: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Check configuration on mount
  useEffect(() => {
    if (!isFirebaseConfigured) {
        setShowConfig(true);
        setError("Chưa tìm thấy cấu hình Firebase. Vui lòng nhập thông tin bên dưới.");
    }
  }, []);

  // Config Form State
  const [configForm, setConfigForm] = useState({
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
  });

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const appUser: UserType = {
        id: user.uid,
        username: user.email || '',
        password: '',
        fullName: user.displayName || 'User',
        role: user.email === 'admin@example.com' ? 'admin' : 'member',
        createdAt: Date.now()
      };
      
      onLogin(appUser, true);
    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      
      let msg = 'Đăng nhập thất bại.';
      const errCode = err.code || '';
      const errMessage = err.message || '';

      // Check for specific API Key errors
      if (
          errCode === 'auth/invalid-api-key' || 
          errMessage.includes('api-key-not-valid') ||
          errMessage.includes('valid-api-key') ||
          !isFirebaseConfigured
      ) {
          msg = 'API Key không hợp lệ hoặc chưa được cấu hình.';
          setShowConfig(true); // Open config modal automatically
      } else if (errCode === 'auth/configuration-not-found') {
          msg = 'Chưa cấu hình Firebase Auth trong Console.';
      } else if (errCode === 'auth/popup-closed-by-user') {
          msg = 'Bạn đã đóng cửa sổ đăng nhập.';
      } else if (errCode === 'auth/unauthorized-domain') {
          msg = 'Domain hiện tại chưa được cấp quyền trong Firebase Console.';
      } else {
          msg = errMessage || msg;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
      if (!configForm.apiKey || !configForm.authDomain) {
          alert("Vui lòng nhập ít nhất API Key và Auth Domain");
          return;
      }
      localStorage.setItem('firebase_config', JSON.stringify(configForm));
      alert("Đã lưu cấu hình. Trang web sẽ tải lại.");
      window.location.reload();
  };

  const handleClearConfig = () => {
      if(confirm("Xóa cấu hình đã lưu?")) {
          localStorage.removeItem('firebase_config');
          window.location.reload();
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Main Login Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 relative overflow-hidden z-10">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-8">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-inner relative group cursor-pointer" onClick={() => setShowConfig(true)}>
              <Lock className="text-blue-500" size={28} />
              <div className="absolute inset-0 bg-blue-500/20 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Settings size={20} className="text-blue-200" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Đăng Nhập Hệ Thống</h1>
            <p className="text-slate-400 text-sm mt-2">RankTracker AI & Content Studio</p>
            <p className="text-xs text-emerald-400 mt-1 font-medium">✨ Chế độ Online: Dữ liệu đồng bộ mọi thiết bị</p>
          </div>

          <div className="space-y-5">
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-red-200">{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white hover:bg-slate-200 text-slate-900 font-bold py-3 rounded-lg shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" fill="#EA4335" />
                  </svg>
                  Đăng nhập bằng Google
                </>
              )}
            </button>
            
            <button 
                onClick={() => setShowConfig(true)}
                className="w-full py-2 text-xs text-slate-500 hover:text-blue-400 transition underline"
            >
                Cấu hình Firebase (Nếu gặp lỗi)
            </button>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfig && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <Settings size={18} className="text-blue-400"/> Cấu hình Firebase
                      </h3>
                      <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                      <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-200">
                          <p className="font-bold mb-1 flex items-center gap-1"><HelpCircle size={12}/> Hướng dẫn:</p>
                          1. Vào <a href="https://console.firebase.google.com/" target="_blank" className="underline text-blue-400">Firebase Console</a> > Project Settings.<br/>
                          2. Kéo xuống phần "Your apps" > "SDK Setup and Configuration".<br/>
                          3. Chọn "Config" và copy các giá trị vào đây.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="col-span-1 sm:col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">apiKey <span className="text-red-500">*</span></label>
                              <input 
                                value={configForm.apiKey}
                                onChange={e => setConfigForm({...configForm, apiKey: e.target.value})}
                                type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="AIzaSy..." />
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                              <label className="block text-xs text-slate-400 mb-1">authDomain <span className="text-red-500">*</span></label>
                              <input 
                                value={configForm.authDomain}
                                onChange={e => setConfigForm({...configForm, authDomain: e.target.value})}
                                type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="project-id.firebaseapp.com" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">projectId</label>
                              <input 
                                value={configForm.projectId}
                                onChange={e => setConfigForm({...configForm, projectId: e.target.value})}
                                type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="project-id" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">storageBucket</label>
                              <input 
                                value={configForm.storageBucket}
                                onChange={e => setConfigForm({...configForm, storageBucket: e.target.value})}
                                type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="project-id.appspot.com" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">messagingSenderId</label>
                              <input 
                                value={configForm.messagingSenderId}
                                onChange={e => setConfigForm({...configForm, messagingSenderId: e.target.value})}
                                type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" />
                          </div>
                          <div>
                              <label className="block text-xs text-slate-400 mb-1">appId</label>
                              <input 
                                value={configForm.appId}
                                onChange={e => setConfigForm({...configForm, appId: e.target.value})}
                                type="text" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white focus:border-blue-500 outline-none" />
                          </div>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-800 flex justify-between">
                      <button onClick={handleClearConfig} className="text-red-400 hover:text-red-300 text-sm px-3 py-2">Xóa cấu hình cũ</button>
                      <div className="flex gap-2">
                          <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Đóng</button>
                          <button onClick={handleSaveConfig} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                              <Save size={16}/> Lưu & Tải lại
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;