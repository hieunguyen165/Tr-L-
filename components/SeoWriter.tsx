import React, { useState } from 'react';
import { Sparkles, Copy, Check, FileText, PenTool, Globe, Info, Code } from 'lucide-react';
import * as geminiService from '../services/gemini';
import { SeoArticleResponse } from '../types';

const SeoWriter: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [domain, setDomain] = useState('');
  const [tone, setTone] = useState('Chuyên nghiệp, tin cậy');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeoArticleResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'meta' | 'schema'>('content');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setResult(null);
    setActiveTab('content');
    
    try {
      const content = await geminiService.generateSeoArticle(topic, keywords, tone, domain);
      setResult(content);
    } catch (error) {
      console.error(error);
      // Handle error visually if needed
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple Markdown Parser to render HTML without external libraries
  const renderMarkdown = (text: string) => {
    if (!text) return { __html: '' };

    let html = text
      // Sanitize basic chars to prevent HTML injection from raw text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-blue-400 mt-8 mb-4 border-b border-slate-700/50 pb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mb-6">$1</h1>')
      
      // Bold (**text**)
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-blue-200 font-bold">$1</strong>')
      
      // Italic (*text*)
      .replace(/\*(.*?)\*/gim, '<em class="text-slate-300 italic">$1</em>')
      
      // Lists (- item)
      .replace(/^\- (.*$)/gim, '<div class="flex items-start mb-2"><span class="mr-2 text-blue-500">•</span><span class="text-slate-300">$1</span></div>')
      
      // Blockquotes (> text)
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 italic text-slate-400 my-4 bg-slate-900/50 py-2 rounded-r">$1</blockquote>')
      
      // Line breaks
      .replace(/\n/gim, '<br />');

    // Cleanup excessive br tags
    html = html.replace(/(<\/h[1-6]>)(<br \/>)+/g, '$1');
    html = html.replace(/(<\/blockquote>)(<br \/>)+/g, '$1');
    html = html.replace(/(<\/div>)(<br \/>)+/g, '$1');

    return { __html: html };
  };

  return (
    <div className="w-full px-4 py-4 h-full flex flex-col">
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PenTool className="text-blue-500" size={20} />
            Viết bài chuẩn SEO (Structured AI)
          </h2>
          <p className="text-sm text-slate-400 hidden sm:block">Hệ thống AI chuyên sâu tạo nội dung, meta tags, schema và checklist SEO tự động.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Input Form - 30% Width on Desktop */}
        <div className="w-full lg:w-[30%] bg-slate-800 border border-slate-700 rounded-xl shrink-0 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-900/30 flex items-center gap-2">
             <Sparkles size={16} className="text-blue-400"/> 
             <span className="font-medium text-white text-sm">Thông tin đầu vào</span>
          </div>
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Chủ đề bài viết (H1)</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ví dụ: Hướng dẫn tối ưu SEO Onpage 2025"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-sm leading-tight pt-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Từ khóa chính</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Ví dụ: seo onpage"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Domain</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Ví dụ: myweb.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Giọng văn</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm h-[42px]"
                >
                  <option value="Chuyên nghiệp, tin cậy">Chuyên nghiệp</option>
                  <option value="Thân thiện, gần gũi">Thân thiện</option>
                  <option value="Hài hước, dí dỏm">Hài hước</option>
                  <option value="Thuyết phục, bán hàng">Bán hàng</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium h-[42px] rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 text-sm px-4"
                >
                  {loading ? (
                    <>
                    <Sparkles className="animate-spin" size={16} />
                    <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Tạo bài viết</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            {loading && (
                 <div className="text-xs text-blue-400 text-center mt-4 animate-pulse flex flex-col items-center justify-center gap-2">
                   <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                   <span>AI đang phân tích từ khóa...</span>
                   <span>Và viết bài chuẩn SEO...</span>
                 </div>
              )}
          </div>
        </div>

        {/* Output Area - 70% Width on Desktop */}
        <div className="w-full lg:w-[70%] flex-1 flex flex-col gap-4 min-h-0 overflow-hidden">
          
          {!result && !loading && (
             <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 p-8">
                <Sparkles size={64} className="mb-6 opacity-20 text-blue-500" />
                <h3 className="text-xl font-medium text-slate-300 mb-2">Sẵn sàng viết bài</h3>
                <p className="max-w-md text-center text-sm">Nhập thông tin bên trái để bắt đầu tạo nội dung chuẩn SEO.</p>
             </div>
          )}

          {loading && (
             <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-medium text-white mb-2">Đang viết bài chuẩn SEO...</h3>
                <div className="space-y-2 max-w-sm w-full">
                  <div className="h-2 bg-slate-700 rounded overflow-hidden">
                    <div className="h-full bg-blue-500 animate-progress origin-left"></div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">Đang tối ưu hóa nội dung</p>
                </div>
             </div>
          )}

          {result && (
            <div className="flex flex-col h-full gap-4 overflow-hidden">
               {/* Stats / Meta Bar */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex flex-col justify-center">
                    <div className="text-xs text-slate-400 mb-1">Mật độ từ khóa</div>
                    <div className="flex items-baseline gap-2">
                       <span className="text-base font-bold text-white">{result.seo_checklist.density_est}%</span>
                       <span className="text-[10px] text-slate-500">Target: {result.seo_checklist.target_occurrences} lần</span>
                    </div>
                  </div>
                   <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex flex-col justify-center">
                    <div className="text-xs text-slate-400 mb-1">Số từ ước tính</div>
                    <div className="text-base font-bold text-white">~{result.seo_checklist.word_count_target}</div>
                  </div>
                   <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex flex-col justify-center">
                    <div className="text-xs text-slate-400 mb-1">CTA</div>
                    <div className={`text-base font-bold ${result.seo_checklist.cta_included ? 'text-green-400' : 'text-red-400'}`}>
                      {result.seo_checklist.cta_included ? 'Có' : 'Không'}
                    </div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex flex-col justify-center">
                    <div className="text-xs text-slate-400 mb-1">Slug</div>
                    <div className="text-xs font-mono text-blue-400 truncate pt-1" title={result.meta.slug}>/{result.meta.slug}</div>
                  </div>
               </div>

               {/* Main Content Box */}
               <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col min-h-0">
                  {/* Tabs */}
                  <div className="flex items-center border-b border-slate-700 bg-slate-900/50 shrink-0">
                    <button 
                      onClick={() => setActiveTab('content')}
                      className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${activeTab === 'content' ? 'border-blue-500 text-blue-400 bg-slate-800' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                      <FileText size={16} /> Nội dung
                    </button>
                    <button 
                      onClick={() => setActiveTab('meta')}
                      className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${activeTab === 'meta' ? 'border-blue-500 text-blue-400 bg-slate-800' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                      <Info size={16} /> Meta Data
                    </button>
                     <button 
                      onClick={() => setActiveTab('schema')}
                      className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition ${activeTab === 'schema' ? 'border-blue-500 text-blue-400 bg-slate-800' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                      <Code size={16} /> Schema FAQ
                    </button>
                    <div className="ml-auto px-4">
                      <button
                        onClick={() => {
                          if (activeTab === 'content') handleCopy(result.content_markdown);
                          if (activeTab === 'meta') handleCopy(`Title: ${result.meta.title}\nDesc: ${result.meta.description}`);
                          if (activeTab === 'schema') handleCopy(result.faq_schema_jsonld);
                        }}
                        className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-white transition px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg"
                      >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Đã chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900/30">
                    
                    {activeTab === 'content' && (
                      <div className="max-w-none mx-auto">
                        {/* Markdown Content - Full Width (No Sidebar) */}
                        <article className="prose prose-invert prose-slate max-w-none">
                           <div 
                              className="font-sans text-slate-200 leading-relaxed"
                              dangerouslySetInnerHTML={renderMarkdown(result.content_markdown)}
                           />
                        </article>
                      </div>
                    )}

                    {activeTab === 'meta' && (
                       <div className="max-w-2xl mx-auto space-y-6">
                          <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
                             <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Google Preview</div>
                             <div className="font-sans">
                                <div className="text-sm text-slate-400 mb-0.5 flex items-center gap-2">
                                   <div className="bg-slate-700 rounded-full p-1"><Globe size={10}/></div>
                                   {domain || 'example.com'} › {result.meta.slug}
                                </div>
                                <div className="text-xl text-blue-400 hover:underline cursor-pointer font-medium mb-1 truncate">{result.meta.title}</div>
                                <div className="text-sm text-slate-300 leading-snug line-clamp-2">{result.meta.description}</div>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Meta Title ({result.meta.title.length} chars)</label>
                                <div className="bg-slate-900 border border-slate-700 rounded p-3 text-white text-sm">{result.meta.title}</div>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Meta Description ({result.meta.description.length} chars)</label>
                                <div className="bg-slate-900 border border-slate-700 rounded p-3 text-white text-sm">{result.meta.description}</div>
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Focus Keyword</label>
                                <div className="bg-slate-900 border border-slate-700 rounded p-3 text-white text-sm">{result.meta.focus_keyword}</div>
                             </div>
                          </div>
                       </div>
                    )}

                    {activeTab === 'schema' && (
                       <div className="max-w-3xl mx-auto">
                          <div className="flex items-center justify-between mb-2">
                             <h4 className="font-medium text-white">FAQPage JSON-LD</h4>
                             <span className="text-xs text-slate-500">Chèn vào thẻ &lt;head&gt; hoặc cuối &lt;body&gt;</span>
                          </div>
                          <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                            {result.faq_schema_jsonld || '// Không có dữ liệu FAQ'}
                          </pre>
                       </div>
                    )}

                  </div>
               </div>

               {result.notes_missing && result.notes_missing.length > 0 && (
                 <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-xl flex gap-3 shrink-0">
                    <Info className="text-yellow-500 shrink-0" size={18} />
                    <div>
                       <div className="text-sm font-bold text-yellow-500 mb-1">Lưu ý từ AI</div>
                       <ul className="list-disc list-inside text-xs text-yellow-200/70">
                          {result.notes_missing.map((note, idx) => (
                             <li key={idx}>{note}</li>
                          ))}
                       </ul>
                    </div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeoWriter;