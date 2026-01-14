import React, { useState, useRef } from 'react';
import { Camera, MapPin, User, Sparkles, Upload, X, CheckCircle, Download, ArrowRight, ScanFace, FileText } from 'lucide-react';
import * as geminiService from '../services/gemini';

const CheckinGenerator: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // STEP 1: REFERENCE & ANALYSIS
  const [refImage, setRefImage] = useState<{data: string, mimeType: string} | null>(null);
  const [analyzedPrompt, setAnalyzedPrompt] = useState('');
  
  // STEP 2: FACE & GENERATION
  const [faceImage, setFaceImage] = useState<{data: string, mimeType: string} | null>(null);
  const [poseVariation, setPoseVariation] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const refInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        setRefImage({
            data: (reader.result as string).split(',')[1],
            mimeType: file.type
        });
        setAnalyzedPrompt(''); // Reset prompt on new image
    };
    reader.readAsDataURL(file);
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        setFaceImage({
            data: (reader.result as string).split(',')[1],
            mimeType: file.type
        });
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!refImage) return;
    setLoading(true);
    setLoadingText('Đang phân tích 8 tiêu chí Check-in (Identity, Body, Pose, Mood, Outfit, Env, Light, Style)...');
    
    try {
        const prompt = await geminiService.analyzeCheckinReference(refImage.data, refImage.mimeType);
        setAnalyzedPrompt(prompt);
    } catch (e) {
        console.error(e);
        alert('Lỗi phân tích ảnh.');
    } finally {
        setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!faceImage || !analyzedPrompt) return;
    setLoading(true);
    setLoadingText('Đang ghép mặt và tạo 4 ảnh Check-in chất lượng cao...');
    setGeneratedImages([]);

    try {
        // Construct Final Prompt
        let finalPrompt = `Create a High-Quality LIFESTYLE CHECK-IN photo.
        
        INPUT FACE: Use the facial features (eyes, nose, mouth, skin tone) from the Input Image.
        CRITICAL: The face must look natural, NOT "idolized" or over-beautified. Keep it realistic.
        
        CONTEXT & VIBE (Strictly follow this description):
        ${analyzedPrompt}
        `;

        if (poseVariation) {
            finalPrompt += `\n\nPOSE VARIATION REQUEST: ${poseVariation}. Adjust the pose naturally while keeping the environment and outfit logic.`;
        }

        finalPrompt += `\n\nTECHNICAL REQUIREMENTS (IMPORTANT):
        - Style: Realistic, Candid, Lifestyle, "Shot on iPhone 15 Pro Max".
        - Quality: 4k, HDR, Sharp focus on subject.
        - Lighting: Natural lighting, realistic shadows, no studio setup.
        - Skin: Visible skin texture, pores, natural imperfections (no plastic AI skin).
        - Vibe: Casual, authentic, moment captured in daily life.`;

        const images = await geminiService.generateCheckinImage(faceImage, finalPrompt);
        setGeneratedImages(images);

    } catch (e) {
        console.error(e);
        alert('Lỗi tạo ảnh.');
    } finally {
        setLoading(false);
    }
  };

  const downloadImage = (src: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `checkin-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col bg-slate-950">
        {/* Header Tabs */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="text-teal-500" size={24} />
                Tạo Ảnh Check-in (Lifestyle)
            </h2>
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setStep(1)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${step === 1 ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <ScanFace size={16} /> 1. Phân Tích Mẫu
                </button>
                <div className="w-px bg-slate-700 mx-1 my-1"></div>
                <button 
                    onClick={() => {
                        if (analyzedPrompt) setStep(2);
                        else alert("Vui lòng phân tích ảnh mẫu trước.");
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${step === 2 ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <User size={16} /> 2. Ghép Mặt & Tạo
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* LEFT PANEL */}
            <div className="w-full lg:w-[400px] bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                <div className="p-6 space-y-8">
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                            <div>
                                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <Upload size={16} className="text-teal-400"/> Ảnh mẫu Check-in
                                </h3>
                                <p className="text-xs text-slate-500 mb-3">Tải ảnh có vibe, bối cảnh và dáng bạn muốn.</p>
                                {!refImage ? (
                                    <div 
                                        onClick={() => refInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-700 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-slate-800 transition group"
                                    >
                                        <div className="bg-slate-800 p-3 rounded-full mb-3 group-hover:scale-110 transition">
                                            <Upload size={24} className="text-slate-400 group-hover:text-teal-400" />
                                        </div>
                                        <p className="text-sm text-slate-300">Tải ảnh mẫu</p>
                                    </div>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-600 group">
                                        <img src={`data:${refImage.mimeType};base64,${refImage.data}`} className="w-full h-auto max-h-64 object-cover" alt="Ref" />
                                        <button 
                                            onClick={() => { setRefImage(null); setAnalyzedPrompt(''); }}
                                            className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <input type="file" ref={refInputRef} className="hidden" accept="image/*" onChange={handleRefUpload}/>
                            </div>

                            {analyzedPrompt && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-teal-400 flex items-center gap-1">
                                            <FileText size={12}/> Kết quả phân tích (Prompt)
                                        </label>
                                        <span className="text-[10px] text-slate-500">Bạn có thể sửa lại thông số</span>
                                    </div>
                                    <textarea
                                        value={analyzedPrompt}
                                        onChange={(e) => setAnalyzedPrompt(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 h-64 focus:outline-none focus:border-teal-500 leading-relaxed"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleAnalyze}
                                disabled={!refImage || loading || !!analyzedPrompt}
                                className={`w-full py-3 font-bold rounded-lg shadow-lg transition flex items-center justify-center gap-2 ${!!analyzedPrompt ? 'bg-slate-700 text-slate-400' : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/20'}`}
                            >
                                {loading ? <Sparkles className="animate-spin" /> : <Sparkles />}
                                {loading ? 'Đang phân tích...' : (analyzedPrompt ? 'Đã phân tích xong' : 'Phân Tích Ảnh')}
                            </button>

                            {analyzedPrompt && (
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-lg shadow-teal-900/20 transition flex items-center justify-center gap-2 animate-in fade-in"
                                >
                                    Tiếp tục: Ghép Mặt <ArrowRight size={18}/>
                                </button>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <User size={16} className="text-teal-400"/> Ảnh khuôn mặt của bạn
                                </h3>
                                <p className="text-xs text-slate-500 mb-3">AI sẽ dùng khuôn mặt này ghép vào bối cảnh.</p>
                                {!faceImage ? (
                                    <div 
                                        onClick={() => faceInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-700 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-slate-800 transition group"
                                    >
                                        <div className="bg-slate-800 p-2 rounded-full mb-2 group-hover:scale-110 transition">
                                            <Upload size={20} className="text-slate-400 group-hover:text-teal-400" />
                                        </div>
                                        <span className="text-xs text-slate-300">Tải ảnh mặt</span>
                                    </div>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-600 group h-48">
                                        <img src={`data:${faceImage.mimeType};base64,${faceImage.data}`} className="w-full h-full object-cover" alt="Face Ref" />
                                        <button 
                                            onClick={() => setFaceImage(null)}
                                            className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <input type="file" ref={faceInputRef} className="hidden" accept="image/*" onChange={handleFaceUpload}/>
                            </div>

                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Biến thể dáng (Tùy chọn)</label>
                                <textarea
                                    value={poseVariation}
                                    onChange={(e) => setPoseVariation(e.target.value)}
                                    placeholder="Ví dụ: Đổi thành đang nhìn vào máy ảnh cười, hoặc tay cầm ly nước..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-teal-500 h-24 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!faceImage || loading}
                                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg shadow-lg shadow-teal-900/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Sparkles className="animate-spin" /> : <Sparkles />}
                                {loading ? 'Đang tạo 4 ảnh...' : 'Tạo 4 Ảnh Check-in Ngay'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: RESULTS */}
            <div className="flex-1 bg-slate-950 p-6 overflow-y-auto relative flex flex-col items-center">
                
                {loading && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mb-6"></div>
                        <div className="text-teal-400 font-medium animate-pulse">{loadingText}</div>
                    </div>
                )}

                <div className="w-full max-w-5xl">
                     <h3 className="text-lg font-medium text-white mb-4">Kết quả Check-in (4 lựa chọn)</h3>
                     {generatedImages.length === 0 ? (
                        <div className="h-64 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600">
                            {step === 1 ? 'Vui lòng hoàn thành phân tích ảnh mẫu' : 'Tải ảnh mặt và nhấn tạo'}
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
                            {generatedImages.map((imgSrc, idx) => (
                                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700 shadow-2xl w-full">
                                    <img src={imgSrc} alt={`Final Checkin ${idx + 1}`} className="w-full h-auto" />
                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-md">Option {idx+1}</div>
                                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center opacity-0 group-hover:opacity-100 transition">
                                         <button onClick={() => downloadImage(imgSrc)} className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-slate-200 flex items-center gap-2">
                                            <Download size={18}/> Tải ảnh về
                                         </button>
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

export default CheckinGenerator;