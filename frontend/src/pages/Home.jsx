import React, { useState } from 'react';
// ★ 경로 수정: 아까 성공하신 경로(@/lib/AuthContext)로 맞췄습니다!
import { useAuth } from '@/lib/AuthContext'; 
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Users, Headphones, ShieldAlert, TrendingUp, Brain, BarChart3, Shield, Link2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DemoCard from '../components/DemoCard';
import PortalHeader from '../components/PortalHeader';
import { STATIC_DEMOS, CATEGORY_INFO } from '@/lib/demoData';

export default function Home() {
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { user } = useAuth();

  // 고정 데이터 사용
  const demos = STATIC_DEMOS;
  const isLoading = false;

  const filteredDemos = demos.filter(demo => {
    const matchesFilter = filter === 'all' || 
      (filter === 'completed' && demo.status === 'completed') ||
      (filter === 'upcoming' && demo.status === 'in_progress');
    
    const matchesCategory = categoryFilter === 'all' || demo.category === categoryFilter;
    
    const matchesSearch = !searchQuery || 
      demo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      demo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesCategory && matchesSearch;
  });

  const completedCount = demos.filter(d => d.status === 'completed').length;
  const upcomingCount = demos.filter(d => d.status === 'in_progress').length;

  // Group by category
  // ★ demoData.js에서 가져온 카테고리 정보 사용
  const categoryInfo = CATEGORY_INFO;
  
  const demosByCategory = Object.keys(categoryInfo).reduce((acc, category) => {
    acc[category] = filteredDemos.filter(d => d.category === category);
    return acc;
  }, {});

  return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <PortalHeader />

        {/* Main Content */}
        <div className="px-8 py-12 bg-white">
        {/* Toolbar */}
        <div className="flex flex-col gap-5 mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tabs */}
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="bg-gray-100/80 border-0 p-1 rounded-lg">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 text-[13px] rounded-md"
                >
                  전체 <span className="ml-1.5 text-xs text-gray-400">({demos.length})</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="completed"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 text-[13px] rounded-md"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  시연 가능 <span className="ml-1.5 text-xs text-gray-400">({completedCount})</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="upcoming"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 text-[13px] rounded-md"
                >
                  준비 중 <span className="ml-1.5 text-xs text-gray-400">({upcomingCount})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
              <Input
                placeholder="데모 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 bg-gray-50/50 border-gray-200/60 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-gray-300 focus:ring-0 text-[14px] rounded-lg"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              className={`cursor-pointer transition-all text-[12px] px-3 py-1.5 rounded-full ${
                categoryFilter === 'all' 
                  ? 'bg-gray-900 hover:bg-gray-800 text-white border-gray-900' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
              }`}
              onClick={() => setCategoryFilter('all')}
            >
              전체 카테고리
            </Badge>
            {Object.entries(categoryInfo).map(([key, { label, icon: Icon, color }]) => {
              const count = demos.filter(d => d.category === key).length;
              return (
                <Badge
                  key={key}
                  variant="outline"
                  className={`cursor-pointer transition-all text-[12px] px-3 py-1.5 rounded-full ${
                    categoryFilter === key 
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                  onClick={() => setCategoryFilter(key)}
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  {label} ({count})
                </Badge>
              );
            })}
          </div>
          </div>

        {/* Demo Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 bg-gray-100 rounded-2xl" />
            ))}
          </div>
        ) : filteredDemos.length > 0 ? (
          <div className="space-y-12">
            {Object.entries(categoryInfo).map(([categoryKey, { label, icon: CategoryIcon, color }]) => {
              const categoryDemos = demosByCategory[categoryKey];
              if (!categoryDemos || categoryDemos.length === 0) return null;

              return (
                <motion.div
                  key={categoryKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-[22px] font-semibold text-gray-900 tracking-tight">{label}</h2>
                    <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600 text-[11px] px-2 py-0.5">
                      {categoryDemos.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                      {categoryDemos.map((demo, index) => (
                        <DemoCard key={demo.id} demo={demo} index={index} />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-[17px] font-semibold text-gray-900 mb-1.5">검색 결과가 없습니다</h3>
            <p className="text-[14px] text-gray-500">다른 키워드로 검색해 보세요</p>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-20 pt-8 border-t border-gray-200/50">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-[13px] text-gray-400">
            <p>© 2025 LLOYDK. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                모든 시스템 정상 운영 중
              </span>
              {user && (
                <span className="text-gray-400">
                  로그인: {user.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}