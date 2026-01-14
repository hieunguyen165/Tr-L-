import React, { useState, useRef } from 'react';
import { Camera, Shirt, User, Sparkles, Upload, X, CheckCircle, Download, ArrowRight, Layers, Type, Ruler, Weight } from 'lucide-react';
import * as geminiService from '../services/gemini';

const POSES = [
  { id: 'standing_relaxed', name: 'Đứng thả lỏng (Full Body)', prompt: 'Full body shot. Standing naturally, facing forward, arms relaxed by sides, neutral expression. Entire body visible from head to toe.' },
  { id: 'walking_dynamic', name: 'Bước đi năng động (Full Body)', prompt: 'Full body shot. Walking forward with energy, fabric moving slightly, dynamic fashion stride. Entire body visible from head to toe.' },
  { id: 'sitting_stool', name: 'Ngồi ghế cao (Full Body)', prompt: 'Full body shot. Sitting elegantly on a simple minimalist studio stool, one leg extended. Entire body visible from head to toe.' },
  { id: 'hands_pockets', name: 'Tay đút túi (Full Body)', prompt: 'Full body shot. Standing cool with hands in pockets/pants, casual confident look. Entire body visible from head to toe.' },
  { id: 'side_profile', name: 'Góc nghiêng 3/4 (Full Body)', prompt: 'Full body shot. Standing, body turned slightly to the side (3/4 view), looking at camera. Entire body visible from head to toe.' },
  { id: 'arms_crossed', name: 'Khoanh tay (Full Body)', prompt: 'Full body shot. Standing with arms crossed over chest, confident power pose. Entire body visible from head to toe.' },
  { id: 'sitting_floor', name: 'Ngồi bệt (Full Body)', prompt: 'Full body shot. Sitting casually on the studio floor, legs crossed or extended comfortably. Entire body visible from head to toe.' },
  { id: 'custom', name: 'Tùy chỉnh (Nhập lệnh)', prompt: '' }, // Custom placeholder
];

const FashionGenerator: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // STEP 1 DATA
  // We now have two base images: Face and Body
  const [faceImage, setFaceImage] = useState<{data: string, mimeType: string} | null>(null);
  const [bodyImage, setBodyImage] = useState<{data: string, mimeType: string} | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  
  const [selectedPose, setSelectedPose] = useState(POSES[0].id);
  const [customPosePrompt, setCustomPosePrompt] = useState('');
  
  const [generatedModels, setGeneratedModels] = useState<string[]>([]);
  const [selectedModelIndex, setSelectedModelIndex] = useState<number | null>(null);

  // STEP 2 DATA
  const [clothingImages, setClothingImages] = useState<{data: string, mimeType: string, id: string}[]>([]);
  const [finalImages, setFinalImages] = useState<string[]>([]);

  const faceInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  const clothInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'face' | 'body') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        const imageData = {
            data: (reader.result as string).split(',')[1],
            mimeType: file.type
        };
        
        if (type === 'face') setFaceImage(imageData);
        else setBodyImage(imageData);

        setGeneratedModels([]); // Reset generated if new base uploaded
        setSelectedModelIndex(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClothUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        setClothingImages(prev => [...prev, {
            data: (reader.result as string).split(',')[1],
            mimeType: file.type,
            id: crypto.randomUUID()
        }]);
    };
    reader.readAsDataURL(file);
  };

  const removeCloth = (id: string) => {
    setClothingImages(prev => prev.filter(item => item.id !== id));
  };

  const getPosePrompt = () => {
      if (selectedPose === 'custom') {
          return `Full body shot. ${customPosePrompt}. Entire body visible from head to toe.`;
      }
      return POSES.find(p => p.id === selectedPose)?.prompt || '';
  };

  const handleGenerateModel = async () => {
    if (!faceImage || !bodyImage) {
        alert("Vui lòng tải lên cả ảnh khuôn mặt và ảnh dáng người.");
        return;
    }

    setLoading(true);
    setLoadingText('Đang tổng hợp khuôn mặt và dáng người...');
    setGeneratedModels([]);

    try {
        // Construct Prompt
        const posePrompt = getPosePrompt();
        
        const fullPrompt = `Create a photorealistic FULL BODY photo of a person.
        
        INPUTS:
        - Image 1 is the FACE REFERENCE (Identity).
        - Image 2 is the BODY SHAPE REFERENCE (Physique).

        SPECIFIC BODY DETAILS:
        - Height: ${height || 'Based on Image 2'}
        - Weight/Build: ${weight || 'Based on Image 2'}

        CRITICAL INSTRUCTIONS:
        1. FACE: You MUST use the facial features (eyes, nose, mouth, structure) from Image 1. The person must look like the person in Image 1.
        2. BODY: You MUST preserve the body shape from Image 2, adjusting slightly to match the height of ${height || 'source'} and weight of ${weight || 'source'} if specified.
        3. POSE: The person should be ${posePrompt}.
        4. FRAMING: WIDE ANGLE, FULL BODY SHOT. Head to toe must be visible.
        
        Clothing: Keep clothing neutral or similar to Image 2 unless the pose requires change, but fit it to the body shape of Image 2.
        Background: CLEAN, SOLID COLOR STUDIO BACKGROUND (e.g., white, grey). Minimalist.
        Lighting: Soft, flattering studio lighting. 8k resolution.`;

        setLoadingText('Đang tạo mẫu Studio (Face Img 1 + Body Img 2)...');
        
        // Pass both images to the service
        // Order matters: Face first, Body second as per prompt instructions
        const references = [faceImage, bodyImage];
        
        const images = await geminiService.generateFashionImage(references, fullPrompt);
        setGeneratedModels(images);

    } catch (e) {
        console.error(e);
        alert('Lỗi khi tạo người mẫu. Vui lòng thử lại.');
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateOutfit = async () => {
    // Determine the source image for the model
    // If Step 1 generated a model, use it.
    // If not, we fall back to Body Image (Step 1 Image 2) as the base, 
    // assuming user might just want to try clothes on the raw body image.
    const sourceModelImage = selectedModelIndex !== null && generatedModels[selectedModelIndex] 
        ? { data: generatedModels[selectedModelIndex].split(',')[1], mimeType: 'image/png' } 
        : bodyImage; 

    if (!sourceModelImage || clothingImages.length === 0) return;

    setLoading(true);
    setLoadingText('Đang phân tích trang phục...');
    setFinalImages([]);

    try {
        // 1. Analyze Clothes
        const clothDescriptions = [];
        for (const cloth of clothingImages) {
            const desc = await geminiService.analyzeFashionItem(cloth.data, cloth.mimeType);
            clothDescriptions.push(desc);
        }
        const combinedClothPrompt = clothDescriptions.join('. AND ');

        // 2. Construct Prompt (Using Pose from Step 2 selector)
        const posePrompt = getPosePrompt();

        const fullPrompt = `Virtual Try-On: Change the outfit of the person in the image.
        The person MUST be wearing: ${combinedClothPrompt}.
        
        CRITICAL: 
        1. The new clothing must fit perfectly on the EXISTING body shape.
        2. Keep the exact face.
        3. POSE: Generate the person in this pose: ${posePrompt}.
        4. Background MUST remain a CLEAN, SOLID COLOR STUDIO BACKGROUND.
        5. Realistic fabric textures and lighting.
        6. Ensure the FULL BODY remains visible.`;

        setLoadingText('Đang phối đồ và tạo dáng...');

        // 3. Generate
        const images = await geminiService.generateFashionImage([sourceModelImage], fullPrompt);
        setFinalImages(images);

    } catch (e) {
        console.error(e);
        alert('Lỗi khi phối đồ.');
    } finally {
        setLoading(false);
    }
  };

  const downloadImage = (src: string, prefix: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `${prefix}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPoseSelection = () => (
      <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {POSES.map(pose => (
                  <button
                      key={pose.id}
                      onClick={() => setSelectedPose(pose.id)}
                      className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${selectedPose === pose.id ? 'bg-blue-600/20 border-blue-500 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                  >
                      <div className="flex items-center gap-2">
                          {pose.id === 'custom' && <Type size={14}/>}
                          <span className="text-sm font-medium">{pose.name}</span>
                      </div>
                      {selectedPose === pose.id && <CheckCircle size={16} className="text-blue-500"/>}
                  </button>
              ))}
          </div>
          
          {/* Custom Pose Input */}
          {selectedPose === 'custom' && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs text-slate-400 mb-1 block">Mô tả dáng mong muốn (Tiếng Anh/Việt):</label>
                  <textarea
                      value={customPosePrompt}
                      onChange={(e) => setCustomPosePrompt(e.target.value)}
                      placeholder="Ex: Sitting on a white chair, looking to the left, hands on lap..."
                      className="w-full bg-slate-800 border border-blue-500/50 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 h-24 resize-none"
                  />
              </div>
          )}
      </div>
  );

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col bg-slate-950">
        {/* Header Tabs - Changed to Blue */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shirt className="text-blue-500" size={24} />
                Studio Thời Trang AI
            </h2>
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setStep(1)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${step === 1 ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <User size={16} /> 1. Tạo Người Mẫu
                </button>
                <div className="w-px bg-slate-700 mx-1 my-1"></div>
                <button 
                    onClick={() => {
                        if (generatedModels.length > 0 || (faceImage && bodyImage)) setStep(2);
                        else alert("Vui lòng tải ảnh và tạo người mẫu trước.");
                    }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${step === 2 ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    <Layers size={16} /> 2. Phối Đồ
                </button>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* LEFT PANEL: CONFIGURATION */}
            <div className="w-full lg:w-[350px] bg-slate-900 border-r border-slate-800 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                <div className="p-6 space-y-8">
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                            
                            {/* Upload Area 1: Face */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <Camera size={16} className="text-blue-400"/> 1. Ảnh Cận Mặt (Gốc)
                                </h3>
                                <p className="text-xs text-slate-500 mb-2">Để AI giữ nguyên khuôn mặt người mẫu.</p>
                                {!faceImage ? (
                                    <div 
                                        onClick={() => faceInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-700 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition group"
                                    >
                                        <div className="bg-slate-800 p-2 rounded-full mb-2 group-hover:scale-110 transition">
                                            <Upload size={20} className="text-slate-400 group-hover:text-blue-400" />
                                        </div>
                                        <span className="text-xs text-slate-300">Tải ảnh mặt</span>
                                    </div>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-600 group h-32">
                                        <img src={`data:${faceImage.mimeType};base64,${faceImage.data}`} className="w-full h-full object-cover" alt="Face Ref" />
                                        <button 
                                            onClick={() => setFaceImage(null)}
                                            className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <input type="file" ref={faceInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'face')}/>
                            </div>

                            {/* Upload Area 2: Body */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <User size={16} className="text-blue-400"/> 2. Ảnh Dáng (Body)
                                </h3>
                                <p className="text-xs text-slate-500 mb-2">Để AI lấy chuẩn vóc dáng.</p>
                                {!bodyImage ? (
                                    <div 
                                        onClick={() => bodyInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-700 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition group"
                                    >
                                        <div className="bg-slate-800 p-2 rounded-full mb-2 group-hover:scale-110 transition">
                                            <Upload size={20} className="text-slate-400 group-hover:text-blue-400" />
                                        </div>
                                        <span className="text-xs text-slate-300">Tải ảnh dáng</span>
                                    </div>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-600 group h-32">
                                        <img src={`data:${bodyImage.mimeType};base64,${bodyImage.data}`} className="w-full h-full object-cover" alt="Body Ref" />
                                        <button 
                                            onClick={() => setBodyImage(null)}
                                            className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <input type="file" ref={bodyInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'body')}/>
                                
                                {/* Height / Weight Inputs */}
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                            <Ruler size={12}/> Chiều cao
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="VD: 1m65" 
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                                            <Weight size={12}/> Cân nặng
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="VD: 50kg" 
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="border-slate-800" />

                            {/* Pose Selection */}
                            <div>
                                <h3 className="text-sm font-bold text-white mb-3">3. Chọn dáng người mẫu</h3>
                                {renderPoseSelection()}
                            </div>

                            <button
                                onClick={handleGenerateModel}
                                disabled={!faceImage || !bodyImage || loading || (selectedPose === 'custom' && !customPosePrompt.trim())}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Sparkles className="animate-spin" /> : <Sparkles />}
                                {loading ? 'Đang tạo...' : 'Tạo Người Mẫu'}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                             <div>
                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <User size={16} className="text-blue-400"/> Người mẫu đã chọn
                                </h3>
                                {selectedModelIndex !== null && generatedModels[selectedModelIndex] ? (
                                     <div className="relative rounded-xl overflow-hidden border border-blue-500/50 shadow-md shadow-blue-900/10">
                                        <img src={generatedModels[selectedModelIndex]} className="w-full h-48 object-cover object-top" alt="Selected Model" />
                                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-sm">
                                            MODEL
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-xs text-yellow-200">
                                        Bạn chưa chọn người mẫu nào từ Bước 1. Hệ thống sẽ sử dụng ảnh Body gốc.
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                    <Layers size={16} className="text-blue-400"/> Tủ Đồ (Quần áo/Phụ kiện)
                                </h3>
                                <div className="space-y-3">
                                    {clothingImages.map((cloth, idx) => (
                                        <div key={cloth.id} className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
                                            <img src={`data:${cloth.mimeType};base64,${cloth.data}`} className="w-12 h-12 object-cover rounded-md bg-white" alt="Cloth" />
                                            <div className="flex-1 text-xs text-slate-300">Item #{idx + 1}</div>
                                            <button onClick={() => removeCloth(cloth.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition"><X size={14}/></button>
                                        </div>
                                    ))}
                                    
                                    <button 
                                        onClick={() => clothInputRef.current?.click()}
                                        className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-400 hover:bg-slate-800 transition flex items-center justify-center gap-2 text-sm"
                                    >
                                        <Upload size={16} /> Thêm trang phục
                                    </button>
                                    <input type="file" ref={clothInputRef} className="hidden" accept="image/*" onChange={handleClothUpload} />
                                </div>
                            </div>
                            
                            <hr className="border-slate-800" />
                            
                            {/* Pose Selection for Step 2 */}
                             <div>
                                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                     <Type size={16} className="text-blue-400"/> Đổi dáng người mẫu (Tùy chọn)
                                </h3>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                    {renderPoseSelection()}
                                </div>
                            </div>

                            <button
                                onClick={handleGenerateOutfit}
                                disabled={clothingImages.length === 0 || loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Sparkles className="animate-spin" /> : <Sparkles />}
                                {loading ? 'Đang phối đồ...' : 'Thử Đồ Ngay'}
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* RIGHT PANEL: RESULTS */}
            <div className="flex-1 bg-slate-950 p-6 overflow-y-auto relative flex flex-col items-center">
                
                {loading && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                        <div className="text-blue-400 font-medium animate-pulse">{loadingText}</div>
                    </div>
                )}

                {step === 1 && (
                    <div className="w-full max-w-4xl">
                        <h3 className="text-lg font-medium text-white mb-4">Kết quả tạo mẫu</h3>
                        {generatedModels.length === 0 ? (
                            <div className="h-64 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600">
                                Chưa có ảnh nào được tạo
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {generatedModels.map((imgSrc, idx) => (
                                    <div key={idx} className={`relative group rounded-xl overflow-hidden border-2 transition ${selectedModelIndex === idx ? 'border-blue-500 shadow-xl shadow-blue-900/20' : 'border-slate-800'}`}>
                                        <img src={imgSrc} alt="Generated Model" className="w-full h-auto" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                                            <button 
                                                onClick={() => setSelectedModelIndex(idx)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-blue-500 flex items-center gap-2"
                                            >
                                                {selectedModelIndex === idx ? <CheckCircle size={18}/> : null}
                                                {selectedModelIndex === idx ? 'Đã chọn' : 'Chọn mẫu này'}
                                            </button>
                                            <button onClick={() => downloadImage(imgSrc, 'fashion-model')} className="bg-white text-black p-2 rounded-lg hover:bg-slate-200"><Download size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {generatedModels.length > 0 && (
                            <div className="mt-8 flex justify-end">
                                <button 
                                    onClick={() => {
                                        if (selectedModelIndex !== null) setStep(2);
                                        else alert("Vui lòng chọn 1 mẫu ưng ý nhất để tiếp tục.");
                                    }}
                                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition border border-slate-700"
                                >
                                    Sang Bước 2 <ArrowRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="w-full max-w-4xl">
                         <h3 className="text-lg font-medium text-white mb-4">Kết quả phối đồ (Try-On)</h3>
                         {finalImages.length === 0 ? (
                            <div className="h-64 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600">
                                Tải lên trang phục và nhấn "Thử Đồ Ngay"
                            </div>
                        ) : (
                             <div className="grid grid-cols-1 gap-8 justify-items-center">
                                {finalImages.map((imgSrc, idx) => (
                                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700 shadow-2xl max-w-md">
                                        <img src={imgSrc} alt="Final Look" className="w-full h-auto" />
                                        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center opacity-0 group-hover:opacity-100 transition">
                                             <button onClick={() => downloadImage(imgSrc, 'fashion-outfit')} className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-slate-200 flex items-center gap-2">
                                                <Download size={18}/> Tải ảnh về
                                             </button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default FashionGenerator;