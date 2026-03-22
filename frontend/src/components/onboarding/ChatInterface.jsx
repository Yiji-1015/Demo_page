import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, FileText, Sparkles, AlertCircle, ExternalLink } from 'lucide-react'; // ExternalLink 아이콘 추가
import { Button } from "@/components/ui/button";
import { onboardingApi } from '@/api/client';

// ✅ 마크다운 렌더링을 위한 라이브러리 추가
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatInterface({ currentConfig }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 💡 데모 시연용 추천 질문 (Starter Chips)
  const STARTER_QUESTIONS = [
    "📅 연차 휴가는 어떻게 신청하나요?",
    "💳 법인카드 사용 한도와 규정이 궁금해요.",
    "💻 사내 와이파이(Wi-Fi) 접속 비밀번호가 뭔가요?",
    "🚀 신규 입사자 온보딩 체크리스트 알려줘."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => scrollToBottom(), [messages, isLoading]);

  const handleSendMessage = async (textOverride = null) => {
    const queryText = textOverride || input;
    if (!queryText.trim()) return;

    // 1. 유저 메시지 표시
    const userMessage = { role: 'user', content: queryText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 2. 백엔드 호출
      const response = await onboardingApi.post('/chat', {
        query: queryText,
        top_k: 3,
        collection_name: currentConfig?.space_key || 'LLOYDK' // 현재 설정된 space key 전달
      });

      const data = response.data;
      
      // 3. AI 응답 표시 (출처 포함)
      const aiMessage = { 
        role: 'assistant', 
        content: data.answer || "죄송합니다. 답변을 찾지 못했습니다.",
        sources: data.sources || [] // 백엔드가 { title: '...', ... } 리스트를 준다고 가정
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        isError: true,
        content: "❌ 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      
      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          // 웰컴 화면
          <div className="h-full flex flex-col items-center justify-center gap-8 px-4">
            <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-indigo-500 fill-indigo-100" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">무엇을 도와드릴까요?</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                    사내 규정, 복지, 업무 가이드 등 궁금한 점을 물어보세요.<br/>
                    AI가 사내 지식 베이스를 분석하여 답변해 드립니다.
                </p>
            </div>
            {/* 추천 질문들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {STARTER_QUESTIONS.map((q, idx) => (
                    <button 
                        key={idx}
                        onClick={() => handleSendMessage(q)}
                        className="text-left px-5 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:text-indigo-600 rounded-xl text-sm text-slate-600 transition-all flex items-center justify-between group"
                    >
                        <span>{q}</span>
                        <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                ))}
            </div>
          </div>
        ) : (
          // 대화 내용
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {msg.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 mt-1 shrink-0 border ${msg.isError ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-slate-100 text-indigo-600'}`}>
                      {msg.isError ? <AlertCircle className="w-5 h-5"/> : <Bot className="w-5 h-5"/>}
                  </div>
              )}

              <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}`}>
                
                {/* ✅ [수정됨] 마크다운 렌더링 적용 */}
                <div className="markdown-content">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            // 링크 클릭 시 새 탭으로 열기
                            a: ({node, ...props}) => (
                                <a 
                                    {...props} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-indigo-600 underline hover:text-indigo-800 font-medium inline-flex items-center gap-0.5"
                                >
                                    {props.children}
                                    <ExternalLink className="w-3 h-3 inline-block" />
                                </a>
                            ),
                            // 리스트 스타일
                            ul: ({node, ...props}) => <ul {...props} className="list-disc pl-5 my-2 space-y-1" />,
                            ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-5 my-2 space-y-1" />,
                            // 제목 스타일
                            h1: ({node, ...props}) => <h1 {...props} className="text-lg font-bold mt-4 mb-2" />,
                            h2: ({node, ...props}) => <h2 {...props} className="text-base font-bold mt-3 mb-1.5" />,
                            h3: ({node, ...props}) => <h3 {...props} className="text-sm font-bold mt-2 mb-1" />,
                            // 인용구 스타일
                            blockquote: ({node, ...props}) => <blockquote {...props} className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-2 bg-slate-50 py-1 pr-2 rounded-r" />,
                            // 코드 블록 스타일
                            code: ({node, inline, className, children, ...props}) => {
                                return inline ? (
                                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-xs" {...props}>
                                        {children}
                                    </code>
                                ) : (
                                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg my-2 overflow-x-auto text-xs font-mono">
                                        <code {...props}>{children}</code>
                                    </div>
                                );
                            },
                            // 테이블 스타일
                            table: ({node, ...props}) => <div className="overflow-x-auto my-3"><table {...props} className="min-w-full border-collapse border border-slate-200 text-xs" /></div>,
                            thead: ({node, ...props}) => <thead {...props} className="bg-slate-50" />,
                            th: ({node, ...props}) => <th {...props} className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-700" />,
                            td: ({node, ...props}) => <td {...props} className="border border-slate-200 px-3 py-2 text-slate-600" />,
                        }}
                    >
                        {msg.content}
                    </ReactMarkdown>
                </div>

                {/* ✅ 출처 표시 */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                            <FileText className="w-3 h-3" /> 참고 문서
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {msg.sources.map((src, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
                                     onClick={() => src.url && window.open(src.url, '_blank')} // URL 있으면 클릭 시 이동
                                >
                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-[3px] font-mono shrink-0">
                                        DOC-{sIdx + 1}
                                    </span>
                                    <span className="text-xs text-slate-600 truncate flex-1">
                                        {src.title || "제목 없음"}
                                    </span>
                                    {src.url && <ExternalLink className="w-3 h-3 text-slate-400" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* 로딩 중 표시 */}
        {isLoading && (
           <div className="flex justify-start">
             <div className="w-8 h-8 bg-white border border-slate-100 rounded-full flex items-center justify-center mr-3">
                 <Bot className="w-5 h-5 text-indigo-600" />
             </div>
             <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
               <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
               <span className="text-xs text-slate-500">답변을 생성하고 있습니다...</span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 영역 */}
      <div className="p-5 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex gap-3 relative">
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="궁금한 내용을 입력하세요..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-5 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                disabled={isLoading}
            />
            <Button 
                size="icon" 
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-2 h-9 w-9 bg-slate-900 hover:bg-slate-800 rounded-lg transition-all"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
            </Button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            LLOYDK AI Assistant는 사내 컨플루언스 문서를 기반으로 답변합니다.
        </p>
      </div>
    </div>
  );
}