import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Settings, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils'; 
import { toast } from 'sonner';

// 컴포넌트 import
import ChatArea from '../components/onboarding/ChatArea';
import DocumentManager from '../components/onboarding/DocumentManager'; 

export default function OnboardingService() {
  const [currentView, setCurrentView] = useState('chat'); 
  const [messages, setMessages] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  
  const [confluenceConfig, setConfluenceConfig] = useState(null);
  
  // 🌟 핵심 상태: 임베딩이 되었는지 여부
  const [embeddingInitialized, setEmbeddingInitialized] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      if (response.ok) {
        setBackendConnected(true);
      }
    } catch (error) {
      console.error("연결 실패:", error);
      setBackendConnected(false);
      setDemoMode(true);
    }
  };

  const enableDemoMode = () => {
    setDemoMode(true);
    setEmbeddingInitialized(true);
    toast.success('데모 모드가 활성화되었습니다!');
  };

  const handleClearChat = () => {
    setMessages([]);
    toast.success('채팅 기록이 삭제되었습니다');
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-5 text-[14px]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-3 rounded-xl bg-gray-100">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69425d25058a80a1c4b3e584/ba2042d8b_favicon.png"
                  alt="Logo" className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h1 className="text-[24px] font-semibold text-gray-900">신입사원 온보딩 서비스</h1>
                <p className="text-[14px] text-gray-500 mt-0.5">사내 Confluence 문서를 기반으로 답변해드립니다</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2.5">
              <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
                <Button
                  variant={currentView === 'chat' ? 'white' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('chat')}
                  className={`text-[13px] h-8 ${currentView === 'chat' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> 채팅
                </Button>
                <Button
                  variant={currentView === 'settings' ? 'white' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('settings')}
                  className={`text-[13px] h-8 ${currentView === 'settings' ? 'bg-white shadow-sm' : 'text-slate-500'}`}
                >
                  <Settings className="w-4 h-4 mr-2" /> 관리자 설정
                </Button>
              </div>
              
              {!backendConnected && !demoMode && (
                <Button onClick={enableDemoMode} size="sm" className="bg-gray-900 text-white h-9 rounded-lg">
                  데모 모드로 체험하기
                </Button>
              )}
              {currentView === 'chat' && messages.length > 0 && (
                <Button onClick={handleClearChat} variant="outline" size="sm" className="text-red-600 border-gray-200 h-9 rounded-lg">
                  <Trash2 className="w-4 h-4 mr-2" /> 채팅 삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden bg-slate-50">
        {currentView === 'chat' ? (
          <div className="flex-1 flex justify-center bg-white">
            <div className="w-full max-w-5xl h-full flex flex-col">
                <ChatArea
                    messages={messages}
                    setMessages={setMessages}
                    embeddingInitialized={embeddingInitialized}
                    demoMode={demoMode}
                    currentSessionId={null}
                    onCreateSession={() => {}}
                />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6 flex justify-center">
             <div className="w-full max-w-6xl">
                {/* 🚀 수정: setEmbeddingInitialized 함수를 자식에게 넘겨줌 */}
                <DocumentManager 
                  confluenceConfig={confluenceConfig} 
                  setConfluenceConfig={setConfluenceConfig}
                  setEmbeddingInitialized={setEmbeddingInitialized}
                />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}