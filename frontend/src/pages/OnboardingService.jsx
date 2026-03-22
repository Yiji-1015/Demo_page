import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

import Sidebar from '../components/onboarding/Sidebar';
import ChatInterface from '../components/onboarding/ChatInterface';

export default function OnboardingService() {
  const [embeddingInitialized] = useState(true); 

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      
      {/* 헤더: slate-900 테마 유지 */}
      <header className="h-16 flex items-center justify-between px-6 border-b shrink-0 bg-slate-900 z-10">
        <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')} className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg tracking-tight leading-none">Knowledge AI</span>
              <span className="text-[10px] text-green-400 flex items-center gap-1 mt-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> System Admin (Verified)
              </span>
            </div>
        </div>
      </header>

      {/* 바디: 사이드바 너비 확장 및 유연한 채팅창 */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* ✅ 사이드바 너비를 500px로 확장 (약 1.5배) */}
        <aside className="w-[400px] flex-none border-r bg-slate-50 overflow-hidden">
          <Sidebar />
        </aside>

        {/* 채팅창: min-w-0을 주어야 내부 요소들이 사이드바에 밀려 찌그러지지 않음 */}
        <div className="flex-1 flex flex-col relative border-l bg-white min-w-0">
          <ChatInterface
            isClientMode={false}
            embeddingInitialized={embeddingInitialized}
          />
        </div>
      </div>
    </div>
  );
}