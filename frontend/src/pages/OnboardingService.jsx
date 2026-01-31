import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Sidebar from '../components/onboarding/Sidebar';
import ChatArea from '../components/onboarding/ChatArea';

export default function OnboardingService() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [confluenceConnected, setConfluenceConnected] = useState(false);
  const [confluenceConfig, setConfluenceConfig] = useState(null);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoriesData, setCategoriesData] = useState(null);
  const [filteredPageIds, setFilteredPageIds] = useState([]);
  const [embeddingInitialized, setEmbeddingInitialized] = useState(false);
  const [collectionInfo, setCollectionInfo] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // Check backend on mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    // 1. 환경변수 가져오기 (.env에 적은 이름과 똑같아야 합니다!)
    // 혹시 .env에 VITE_CHATBOT_API_URL 이라고 적으셨다면 뒤에 _URL을 꼭 붙여주세요.
    const API_BASE_URL = import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8000';
    
    try {
      console.log("연결 시도 주소:", API_BASE_URL); // F12 콘솔에서 확인용
  
      // 2. 환경변수 주소로 요청 보내기 (백틱 ` ` 사용 주의)
      const response = await fetch(`${API_BASE_URL}/`);
  
      if (response.ok) {
        setBackendConnected(true);
        const data = await response.json();
        toast.success(data.message || '백엔드 연결됨');
      }
    } catch (error) {
      console.error("연결 실패:", error);
      setBackendConnected(false);
      // 백엔드 연결 실패 시 데모 모드 제안하지 않음 (자동으로 데모 모드 활성화)
      setDemoMode(true);
    }
  };

  const enableDemoMode = () => {
    setDemoMode(true);
    setConfluenceConnected(true);
    setEmbeddingInitialized(true);
    setCategoriesLoaded(true);
    setCollectionInfo({ points_count: 45 });
    toast.success('데모 모드가 활성화되었습니다! 샘플 데이터로 체험해보세요.');
  };

  const handleClearChat = () => {
    setMessages([]);
    toast.success('채팅 기록이 삭제되었습니다');
  };

  const createNewSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: '새 대화',
      messages: [],
      createdAt: new Date().toISOString()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const loadSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
  };

  const deleteSession = (sessionId) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    toast.success('세션이 삭제되었습니다');
  };

  // 메시지가 변경될 때 현재 세션 업데이트
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          // 첫 메시지로 제목 자동 생성
          const title = messages[0]?.content?.slice(0, 30) || '새 대화';
          return { ...session, messages, title };
        }
        return session;
      }));
    }
  }, [messages, currentSessionId]);

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto">
          <Link to={createPageUrl('Home')} className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-5 transition-colors text-[14px]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="p-3 rounded-xl bg-gray-100">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69425d25058a80a1c4b3e584/ba2042d8b_favicon.png"
                  alt="Confluence"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <h1 className="text-[24px] font-semibold text-gray-900 tracking-tight">신입사원 온보딩 서비스</h1>
                <p className="text-[14px] text-gray-500 mt-0.5">사내 Confluence 문서를 기반으로 답변해드립니다</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2.5">
              {demoMode && (
                <Badge className="bg-purple-100/80 text-purple-700 border-0 text-[12px] px-2.5 py-1 rounded-full">데모 모드</Badge>
              )}
              <Badge className="bg-green-100/80 text-green-700 border-0 text-[12px] px-2.5 py-1 rounded-full">시연 가능</Badge>
              {!backendConnected && !demoMode && (
                <Button
                  onClick={enableDemoMode}
                  size="sm"
                  className="bg-gray-900 hover:bg-gray-800 text-white text-[13px] h-9 rounded-lg"
                >
                  데모 모드로 체험하기
                </Button>
              )}
              {messages.length > 0 && (
                <Button
                  onClick={handleClearChat}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-gray-200 text-[13px] h-9 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  채팅 삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className={`hidden lg:block bg-gray-50/50 border-r border-gray-200/50 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? 'w-0' : 'w-[580px]'
        }`}>
          <Sidebar
            backendConnected={backendConnected}
            confluenceConnected={confluenceConnected}
            setConfluenceConnected={setConfluenceConnected}
            confluenceConfig={confluenceConfig}
            setConfluenceConfig={setConfluenceConfig}
            categoriesLoaded={categoriesLoaded}
            setCategoriesLoaded={setCategoriesLoaded}
            categoriesData={categoriesData}
            setCategoriesData={setCategoriesData}
            filteredPageIds={filteredPageIds}
            setFilteredPageIds={setFilteredPageIds}
            embeddingInitialized={embeddingInitialized}
            setEmbeddingInitialized={setEmbeddingInitialized}
            collectionInfo={collectionInfo}
            setCollectionInfo={setCollectionInfo}
            chatSessions={chatSessions}
            currentSessionId={currentSessionId}
            onCreateSession={createNewSession}
            onLoadSession={loadSession}
            onDeleteSession={deleteSession}
          />
        </aside>

        {/* Sidebar - Mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                className="fixed inset-y-0 left-0 w-[320px] bg-white z-50 lg:hidden overflow-y-auto shadow-2xl"
              >
                <div className="px-5 py-4 border-b border-gray-200/50 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 text-[15px]">설정</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <Sidebar
                  backendConnected={backendConnected}
                  confluenceConnected={confluenceConnected}
                  setConfluenceConnected={setConfluenceConnected}
                  confluenceConfig={confluenceConfig}
                  setConfluenceConfig={setConfluenceConfig}
                  categoriesLoaded={categoriesLoaded}
                  setCategoriesLoaded={setCategoriesLoaded}
                  categoriesData={categoriesData}
                  setCategoriesData={setCategoriesData}
                  filteredPageIds={filteredPageIds}
                  setFilteredPageIds={setFilteredPageIds}
                  embeddingInitialized={embeddingInitialized}
                  setEmbeddingInitialized={setEmbeddingInitialized}
                  collectionInfo={collectionInfo}
                  setCollectionInfo={setCollectionInfo}
                  chatSessions={chatSessions}
                  currentSessionId={currentSessionId}
                  onCreateSession={createNewSession}
                  onLoadSession={loadSession}
                  onDeleteSession={deleteSession}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          embeddingInitialized={embeddingInitialized}
          demoMode={demoMode}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          currentSessionId={currentSessionId}
          onCreateSession={createNewSession}
        />
      </div>
    </div>
  );
}