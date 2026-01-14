import React, { useState, useEffect } from 'react';

interface AddKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (keywords: string[], domain: string) => void;
  initialDomain?: string;
}

const AddKeywordModal: React.FC<AddKeywordModalProps> = ({ isOpen, onClose, onAdd, initialDomain = '' }) => {
  const [keywordsText, setKeywordsText] = useState('');
  const [domain, setDomain] = useState(initialDomain);

  // Update domain if initialDomain changes when modal opens
  useEffect(() => {
    if (isOpen && initialDomain) {
      setDomain(initialDomain);
    }
  }, [isOpen, initialDomain]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywordList = keywordsText.split('\n').map(k => k.trim()).filter(k => k);

    if (keywordList.length > 0 && domain.trim()) {
      onAdd(keywordList, domain.trim());
      setKeywordsText('');
      // Don't clear domain to keep it consistent for next add in same project
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-4">Thêm từ khóa vào dự án</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Danh sách từ khóa (mỗi từ 1 dòng)</label>
            <textarea
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="ví dụ:&#10;thiết kế web&#10;seo từ khóa"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition h-32 resize-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Domain / Website</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="ví dụ: example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!keywordsText.trim() || !domain}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Thêm {keywordsText.split('\n').filter(k => k.trim()).length > 1 ? 'các' : ''} theo dõi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddKeywordModal;