import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Download, X, Upload, FileDown, Zap } from 'lucide-react';
import * as geminiService from '../services/gemini';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  // Aspect ratio is now hardcoded/processed to 1800x900 (2:1), requesting 16:9 from API as closest base.
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [referenceImage, setReferenceImage] = useState<{data: string, mimeType: string} | null>(null);
  const [compressingId, setCompressingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      setReferenceImage({
        data: base64Data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !referenceImage) return;

    setLoading(true);
    setGeneratedImages([]);
    
    try {
      let finalPrompt = prompt;

      if (referenceImage) {
        const imageDescription = await geminiService.analyzeImageForPrompt(referenceImage.data, referenceImage.mimeType);
        if (imageDescription) {
          finalPrompt = prompt 
            ? `${prompt}. Style and composition reference: ${imageDescription}`
            : imageDescription;
        }
      }

      // Always request 16:9 from API, we will resize/crop to 1800x900 (2:1) on download
      const images = await geminiService.generateSeoImages(finalPrompt, '16:9');
      setGeneratedImages(images);
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tạo ảnh. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resizes image to exactly 1800x900 and handles compression based on mode.
   */
  const processImage = (base64Str: string, mode: 'hq' | 'seo'): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1800;
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        // Fill background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 1800, 900);

        // Calculate "cover" fit
        const targetRatio = 1800 / 900; // 2.0
        const sourceRatio = img.width / img.height;

        let drawWidth = 1800;
        let drawHeight = 900;
        let offsetX = 0;
        let offsetY = 0;

        if (sourceRatio > targetRatio) {
          // Source is wider than target (very rare if source is 16:9)
          drawHeight = 900;
          drawWidth = 900 * sourceRatio;
          offsetX = (1800 - drawWidth) / 2;
        } else {
          // Source is narrower/taller than target (e.g. 16:9 is 1.77 < 2.0)
          // We need to scale width to match 1800
          drawWidth = 1800;
          drawHeight = 1800 / sourceRatio;
          offsetY = (900 - drawHeight) / 2; // Center vertically
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        if (mode === 'hq') {
           // High quality 0.95
           resolve(canvas.toDataURL('image/jpeg', 0.95));
        } else {
           // SEO mode: < 500KB
           let quality = 0.9;
           let dataUrl = canvas.toDataURL('image/jpeg', quality);
           
           // Simple loop to reduce size
           while ((dataUrl.length * 0.75 / 1024) > 500 && quality > 0.1) {
             quality -= 0.1;
             dataUrl = canvas.toDataURL('image/jpeg', quality);
           }
           resolve(dataUrl);
        }
      };
      img.onerror = (e) => reject(e);
    });
  };

  const downloadImage = async (dataUrl: string, index: number, type: 'hq' | 'seo') => {
    try {
      setCompressingId(index);
      
      const processedDataUrl = await processImage(dataUrl, type);
      const suffix = type === 'seo' ? 'seo-optimized' : 'hq';

      const link = document.createElement('a');
      link.href = processedDataUrl;
      link.download = `seo-image-1800x900-${Date.now()}-${index + 1}-${suffix}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
      alert("Lỗi khi xử lý ảnh");
    } finally {
      setCompressingId(null);
    }
  };

  return (
    <div className="w-full px-4 py-4 h-full flex flex-col">
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="text-purple-500" size={20} />
            Tạo ảnh minh họa (Imagen 4)
          </h2>
          <p className="text-sm text-slate-400 hidden sm:block">Tạo hình ảnh chất lượng cao cho bài viết SEO từ mô tả hoặc ảnh mẫu.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Input Column - 30% */}
        <div className="w-full lg:w-[30%] bg-slate-800 border border-slate-700 rounded-xl shrink-0 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-900/30 flex items-center gap-2">
             <Sparkles size={16} className="text-purple-400"/> 
             <span className="font-medium text-white text-sm">Cấu hình tạo ảnh</span>
          </div>
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
            <form onSubmit={handleGenerate} className="space-y-4">
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mô tả ảnh mong muốn</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ví dụ: Một văn phòng hiện đại với nhiều cây xanh, ánh sáng tự nhiên, phong cách minimalist..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none h-32 resize-none text-sm leading-tight pt-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Ảnh mẫu (Tùy chọn)</label>
                {!referenceImage ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-slate-700/30 transition group"
                  >
                    <Upload size={24} className="text-slate-500 group-hover:text-purple-400 mb-2" />
                    <span className="text-xs text-slate-400">Click để tải ảnh lên</span>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border border-slate-600 group">
                    <img 
                      src={`data:${referenceImage.mimeType};base64,${referenceImage.data}`} 
                      alt="Ref" 
                      className="w-full h-32 object-cover opacity-70 group-hover:opacity-100 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setReferenceImage(null)}
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[10px] text-center text-white">
                      Ảnh mẫu
                    </div>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Kích thước đầu ra</label>
                <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 font-mono flex items-center justify-between">
                    <span>1800 x 900 px</span>
                    <span className="text-xs text-slate-500">(2:1)</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                   Ảnh sẽ được tự động crop và resize về kích thước chuẩn SEO (1800x900) khi tải xuống.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || (!prompt && !referenceImage)}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium h-[42px] rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20 text-sm px-4"
                >
                  {loading ? (
                    <>
                    <Sparkles className="animate-spin" size={16} />
                    <span>Đang vẽ...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Tạo 2 hình ảnh</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            
            {loading && (
               <div className="mt-6 p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg">
                 <div className="flex items-center gap-3 text-purple-300 text-xs mb-2">
                   <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                   {referenceImage ? 'Đang phân tích ảnh mẫu & tạo ảnh mới...' : 'Đang tạo ảnh từ mô tả...'}
                 </div>
                 <div className="h-1 bg-slate-700 rounded overflow-hidden w-full">
                    <div className="h-full bg-purple-500 animate-progress origin-left"></div>
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* Output Column - 70% */}
        <div className="w-full lg:w-[70%] flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-800 border border-slate-700 rounded-xl relative">
          
          {generatedImages.length === 0 && !loading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-8">
                <ImageIcon size={64} className="mb-6 opacity-20 text-purple-500" />
                <h3 className="text-xl font-medium text-slate-300 mb-2">Chưa có hình ảnh</h3>
                <p className="max-w-md text-center text-sm">Nhập mô tả hoặc tải ảnh mẫu lên và nhấn "Tạo" để nhận 2 hình ảnh minh họa chất lượng cao.</p>
             </div>
          )}

          <div className="h-full overflow-y-auto custom-scrollbar p-6">
            {generatedImages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {generatedImages.map((imgSrc, idx) => (
                  <div key={idx} className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-700 slide-in-from-bottom-4">
                    <div className="relative flex-1 group">
                       <img 
                          src={imgSrc} 
                          alt={`Generated ${idx}`} 
                          className="w-full h-full object-cover"
                       />
                       
                       {/* Download Overlay */}
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 gap-3">
                          <button
                            onClick={() => downloadImage(imgSrc, idx, 'hq')}
                            disabled={compressingId === idx}
                            className="w-full py-2 bg-white hover:bg-slate-200 text-black font-medium rounded-lg flex items-center justify-center gap-2 transition shadow-lg text-sm disabled:opacity-70"
                          >
                             {compressingId === idx ? (
                               <Sparkles className="animate-spin" size={16} />
                             ) : (
                               <FileDown size={16} />
                             )}
                             Chất lượng cao (1800x900)
                          </button>
                          
                          <button
                            onClick={() => downloadImage(imgSrc, idx, 'seo')}
                            disabled={compressingId === idx}
                            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition shadow-lg text-sm disabled:opacity-70 disabled:cursor-wait"
                          >
                             {compressingId === idx ? (
                               <Sparkles className="animate-spin" size={16} />
                             ) : (
                               <Zap size={16} />
                             )}
                             Tối ưu SEO (&lt;500KB)
                          </button>
                       </div>
                    </div>
                    <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
                       <span>Kích thước: 1800x900px</span>
                       <span className="uppercase font-mono text-purple-400">Imagen 4.0</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;