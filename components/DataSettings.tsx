import React, { useRef, useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, FileJson, Info } from 'lucide-react';
import * as storageService from '../services/storage';

const DataSettings: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleExport = async () => {
    try {
      const dataStr = await storageService.exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_ranktracker_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage({ type: 'success', text: 'Đã xuất file sao lưu thành công!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi khi xuất dữ liệu.' });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        if (confirm('CẢNH BÁO: Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại bằng dữ liệu trong file. Bạn có chắc chắn không?')) {
            const success = storageService.importAllData(content);
            if (success) {
                alert('Khôi phục dữ liệu thành công! Ứng dụng sẽ tự tải lại.');
                window.location.reload();
            } else {
                setMessage({ type: 'error', text: 'File không hợp lệ hoặc bị lỗi.' });
            }
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-slate-950">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="text-pink-500" /> Dữ Liệu & Đồng Bộ
          </h2>
          <p className="text-slate-400 mt-1">Quản lý, sao lưu và di chuyển dữ liệu giữa các thiết bị.</p>
        </div>

        {/* Explanation Card */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-5 mb-8">
            <div className="flex items-start gap-3">
                <Info className="text-blue-400 shrink-0 mt-1" size={20} />
                <div>
                    <h3 className="text-blue-200 font-bold text-sm mb-1">Tại sao dữ liệu không tự đồng bộ?</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        Ứng dụng hiện đang hoạt động ở chế độ <strong>Local (Cục bộ)</strong> để bảo mật và tốc độ cao. Dữ liệu (Chi tiêu, Từ khóa...) được lưu trực tiếp trên thiết bị bạn đang dùng.
                        <br/><br/>
                        Để chuyển dữ liệu từ Máy tính sang Điện thoại (hoặc ngược lại), hãy sử dụng tính năng <strong>Sao lưu</strong> và <strong>Khôi phục</strong> bên dưới.
                    </p>
                </div>
            </div>
        </div>

        {message && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-red-900/20 border-red-500/50 text-red-300'}`}>
                {message.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                {message.text}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Export Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition group">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-700 transition">
                    <Download className="text-green-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1. Sao lưu (Export)</h3>
                <p className="text-sm text-slate-400 mb-6 h-10">
                    Tải toàn bộ dữ liệu hiện tại về máy dưới dạng file <code>.json</code>.
                </p>
                <button 
                    onClick={handleExport}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg border border-slate-700 transition flex items-center justify-center gap-2"
                >
                    <FileJson size={18}/> Tải về máy
                </button>
            </div>

            {/* Import Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition group">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-700 transition">
                    <Upload className="text-orange-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">2. Khôi phục (Import)</h3>
                <p className="text-sm text-slate-400 mb-6 h-10">
                    Chọn file <code>.json</code> đã sao lưu để nạp dữ liệu vào thiết bị này.
                </p>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg shadow-lg shadow-orange-900/20 transition flex items-center justify-center gap-2"
                >
                    <Upload size={18}/> Chọn file backup
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept=".json"
                    onChange={handleImport}
                />
            </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-800">
            <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Hướng dẫn đồng bộ thủ công</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
                <li>Trên <strong>Máy tính</strong> (nơi có dữ liệu), nhấn nút <strong>Tải về máy</strong>.</li>
                <li>Gửi file vừa tải qua Zalo/Messenger/Email cho chính bạn.</li>
                <li>Trên <strong>Điện thoại</strong>, tải file đó về.</li>
                <li>Mở App trên điện thoại, vào mục này và nhấn <strong>Chọn file backup</strong>.</li>
            </ol>
        </div>

      </div>
    </div>
  );
};

export default DataSettings;
