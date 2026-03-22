import React, { useState } from 'react';
import { STATIC_DEMOS, CATEGORY_INFO, getIconComponent } from '@/lib/demoData';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';

// ★ 경로 확인: 아까 설정한 AuthContext 경로
import { useAuth } from '@/lib/AuthContext'; 
// ★ 핵심: 데이터와 카테고리 정보 가져오기
import {
  Home,
  BarChart3,
  CheckCircle2,
  Brain,
  LogOut,
  User,
  Menu,
  ExternalLink,
} from "lucide-react";



export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { user, logout } = useAuth(); 

  // ★ 데이터 연결
  const demos = STATIC_DEMOS;
  const categoryInfo = CATEGORY_INFO;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-[280px]
        bg-gray-50/50 backdrop-blur-xl border-r border-gray-200/50
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-8">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69425d25058a80a1c4b3e584/ba2042d8b_favicon.png"
                alt="LLOYDK"
                className="w-9 h-9 object-contain"
              />
              <div>
                <h1 className="text-[17px] font-semibold text-gray-900 tracking-tight">LLOYDK</h1>
                <p className="text-[11px] text-gray-500 font-medium tracking-wide">DEMO PORTAL</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 overflow-y-auto">
            <div className="mb-8 space-y-1">
              <Link
                to={createPageUrl('Home')}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-[14px]
                  ${currentPageName === 'Home' 
                    ? 'bg-gray-900 text-white font-medium' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-normal'
                  }
                `}
              >
                <Home className="w-[18px] h-[18px]" />
                <span>대시보드</span>
              </Link>
              <Link
                to={createPageUrl('Analytics')}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-[14px]
                  ${currentPageName === 'Analytics' 
                    ? 'bg-gray-900 text-white font-medium' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-normal'
                  }
                `}
              >
                <BarChart3 className="w-[18px] h-[18px]" />
                <span>AI 통합 분석</span>
              </Link>
            </div>

            {/* Categorized Demos */}
            {Object.entries(categoryInfo).map(([categoryKey, { label, icon: CategoryIcon }]) => {
              const categoryDemos = demos.filter(d => d.category === categoryKey);
              if (categoryDemos.length === 0) return null;

              return (
                <div key={categoryKey} className="mb-7">
                  <div className="flex items-center gap-2 px-3 mb-2">
                    <CategoryIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {categoryDemos.map((demo) => {
                      const isCompleted = demo.status === 'completed';
                      const IconComponent = getIconComponent(demo.icon);
                      
                      // 페이지 이름 매핑
                      const demoPageMap = {
                        '신입사원 온보딩 서비스': 'OnboardingService',
                        '문서 품질 및 오류 관리': 'DocumentQuality',
                        '보고서 자동 생성': 'ReportGenerator',
                        '부진재고 관리': 'SlowMovingInventory',
                        'VOC 자동 분류': 'VocService',
                        '사내 보안 규정 챗봇': 'SecurityChatbot',
                      };
                      const demoPage = demoPageMap[demo.title];

                      // ★ 사이드바 링크 로직 (DemoCard와 동일하게 맞춤)
                      let ItemWrapper = 'div';
                      let itemProps = {};

                      if (isCompleted) {
                        if (demo.external_link) {
                          // 1. 외부 링크
                          ItemWrapper = 'a';
                          itemProps = { 
                            href: demo.external_link, 
                            target: '_blank', 
                            rel: 'noopener noreferrer' 
                          };
                        } else if (demoPage) {
                          // 2. 내부 페이지
                          ItemWrapper = Link;
                          itemProps = { to: createPageUrl(demoPage) };
                        }
                      }

                      return (
                        <ItemWrapper
                          key={demo.id}
                          {...itemProps}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-[13px]
                            ${isCompleted 
                              ? 'text-gray-900 hover:bg-gray-100 cursor-pointer font-normal' 
                              : 'text-gray-400 cursor-default font-normal'
                            }
                          `}
                        >
                          <IconComponent className="w-[16px] h-[16px] flex-shrink-0 ..." />
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="block truncate">
                              {demo.title}
                            </span>
                            {/* 외부 링크면 작은 화살표 표시 */}
                            {isCompleted && demo.external_link && (
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          
                          {/* 상태 표시 */}
                          {!isCompleted && demo.expected_date && (
                             <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                               D-{Math.ceil((new Date(demo.expected_date) - new Date()) / (1000 * 60 * 60 * 24))}
                             </span>
                          )}
                          
                          {isCompleted && !demo.external_link && (
                            <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                          )}
                        </ItemWrapper>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User Profile */}
          {user && (
            <div className="p-3 border-t border-gray-200/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 px-3 py-3 text-left hover:bg-gray-100 rounded-lg"
                  >
                    <Avatar className="w-8 h-8 bg-gray-900">
                      <AvatarFallback className="bg-transparent text-white font-medium text-[13px]">
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 shadow-lg">
                  <DropdownMenuItem className="text-gray-700 focus:text-gray-900 focus:bg-gray-50 text-[13px]">
                    <User className="w-4 h-4 mr-2" />
                    프로필
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200" />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-700 focus:bg-red-50 text-[13px]"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-white">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69425d25058a80a1c4b3e584/ba2042d8b_favicon.png"
              alt="LLOYDK"
              className="w-7 h-7 object-contain"
            />
            <span className="font-semibold text-gray-900 text-[15px]">LLOYDK</span>
          </div>
          <div className="w-10" />
        </div>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}