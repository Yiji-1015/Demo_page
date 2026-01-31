import React, { useState } from 'react';
// ⚠️ base44가 작동하지 않으면 이 부분도 나중에 우리 백엔드 API로 교체해야 합니다.
import { base44 } from '@/api/base44Client'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Star, Clock, ExternalLink, Trash2, TrendingUp, Sparkles,
  Tag, Bell, Loader2, Lightbulb
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import RecommendedDocuments from './RecommendedDocuments';

// ✅ 수정 1: 우리가 만든 API Client 가져오기 (경로 확인해주세요!)
// 파일 위치가 src/components 라면 -> ../api/client
import client from '@/api/client'; 

export default function DocumentManager({ confluenceConfig, backendConnected }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recommended');
  const [user, setUser] = React.useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    // base44 연결 시도 (실패 시 로그 출력)
    base44.auth.me()
      .then(setUser)
      .catch((err) => console.warn("Base44 Auth 실패 (이 기능을 안 쓴다면 무시하세요):", err));
  }, []);

  // 즐겨찾기 문서 조회
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      try {
        return await base44.entities.FavoriteDocument.list('-view_count');
      } catch (e) {
        console.error("즐겨찾기 조회 실패:", e);
        return [];
      }
    },
  });

  // 즐겨찾기 삭제
  const deleteFavoriteMutation = useMutation({
    mutationFn: (id) => base44.entities.FavoriteDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('즐겨찾기에서 제거했습니다');
    },
    onError: () => toast.error('삭제 실패 (Base44 연결 확인 필요)'),
  });

  // 조회수 증가
  const incrementViewMutation = useMutation({
    mutationFn: ({ id, count }) => 
      base44.entities.FavoriteDocument.update(id, { view_count: count + 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // 페이지 요약 및 키워드 추출
  const [summarizing, setSummarizing] = useState({});
  const handleSummarizeDocument = async (doc) => {
    setSummarizing(prev => ({ ...prev, [doc.id]: true }));
    try {
      const prompt = `다음 Confluence 문서의 제목은 "${doc.page_title}"입니다.\n... (생략) ...`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            keywords: { 
              type: "array", 
              items: { type: "string" },
              minItems: 3,
              maxItems: 5
            }
          },
          required: ["summary", "keywords"]
        }
      });

      await base44.entities.FavoriteDocument.update(doc.id, {
        summary: result.summary,
        keywords: result.keywords
      });
      
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('AI가 문서를 분석했습니다');
    } catch (error) {
      console.error("요약 실패:", error);
      toast.error('문서 분석에 실패했습니다');
    } finally {
      setSummarizing(prev => ({ ...prev, [doc.id]: false }));
    }
  };

  // ✅ 수정 2: 최신 업데이트 확인 (fetch -> client.post로 변경)
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const handleCheckUpdates = async () => {
    if (!backendConnected || !confluenceConfig) {
      toast.error('백엔드 및 Confluence 연결을 확인해주세요');
      return;
    }

    setCheckingUpdates(true);
    try {
      // ⚠️ 기존: fetch('http://localhost:8000/...') -> 연결 끊김 원인!
      // ✅ 변경: client.post 사용 (환경변수 주소 자동 적용)
      const response = await client.post('/api/confluence/check-updates', {
        ...confluenceConfig,
        page_ids: favorites.map(f => f.page_id)
      });

      // Axios는 .json() 필요 없음, .data에 바로 들어있음
      const data = response.data;
      
      if (data.updated_pages && data.updated_pages.length > 0) {
        for (const pageId of data.updated_pages) {
          const doc = favorites.find(f => f.page_id === pageId);
          if (doc) {
            await base44.entities.FavoriteDocument.update(doc.id, {
              last_updated: new Date().toISOString()
            });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
        toast.success(`${data.updated_pages.length}개 문서가 업데이트되었습니다`);
      } else {
        toast.info('모든 문서가 최신 상태입니다');
      }
    } catch (error) {
      console.error("업데이트 확인 에러:", error);
      toast.error('업데이트 확인에 실패했습니다');
    } finally {
      setCheckingUpdates(false);
    }
  };

  // 검색 필터링
  const filteredDocs = favorites.filter(doc => 
    doc.page_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const frequentDocs = [...favorites].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);
  const recentDocs = [...favorites].sort((a, b) => 
    new Date(b.last_updated || 0) - new Date(a.last_updated || 0)
  ).slice(0, 5);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500" />
          문서 관리
        </h3>
        <Button
          onClick={handleCheckUpdates}
          disabled={checkingUpdates || favorites.length === 0}
          size="sm"
          variant="outline"
        >
          {checkingUpdates ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              확인 중...
            </>
          ) : (
            <>
              <Bell className="w-3 h-3 mr-2" />
              업데이트 확인
            </>
          )}
        </Button>
      </div>

      {/* 검색 */}
      <Input
        placeholder="문서, 카테고리, 키워드 검색..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommended" className="text-xs">
            <Lightbulb className="w-3 h-3 mr-1" />
            AI 추천
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-xs">
            <Star className="w-3 h-3 mr-1" />
            즐겨찾기
          </TabsTrigger>
          <TabsTrigger value="frequent" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            자주 보는
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            최근
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommended" className="space-y-2 mt-4">
          <RecommendedDocuments user={user} />
        </TabsContent>

        <TabsContent value="favorites" className="space-y-2 mt-4">
          {favoritesLoading ? (
            <div className="text-center py-8 text-slate-500">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
              로딩 중...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">즐겨찾기한 문서가 없습니다</p>
            </div>
          ) : (
            filteredDocs.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-800 mb-1">
                      {doc.page_title}
                    </h4>
                    {doc.category && (
                      <Badge variant="outline" className="text-xs mb-2">
                        {doc.category}
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteFavoriteMutation.mutate(doc.id)}
                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {doc.summary && (
                  <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                    {doc.summary}
                  </p>
                )}

                {doc.keywords && doc.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doc.keywords.slice(0, 4).map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Tag className="w-2 h-2 mr-1" />
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    조회 {doc.view_count || 0}회
                  </span>
                  {doc.page_url && (
                    <a
                      href={doc.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => incrementViewMutation.mutate({ id: doc.id, count: doc.view_count || 0 })}
                      className="ml-auto text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      보기
                    </a>
                  )}
                  {!doc.summary && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSummarizeDocument(doc)}
                      disabled={summarizing[doc.id]}
                      className="ml-auto h-6 px-2 text-xs"
                    >
                      {summarizing[doc.id] ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          분석 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI 분석
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="frequent" className="space-y-2 mt-4">
            {/* 기존 코드와 동일 */}
            {frequentDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">자주 보는 문서가 없습니다</p>
            </div>
          ) : (
            frequentDocs.map((doc, idx) => (
              <div key={doc.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-800">{doc.page_title}</h4>
                    <p className="text-xs text-slate-500 mt-1">조회 {doc.view_count}회</p>
                  </div>
                  {doc.page_url && (
                    <a
                      href={doc.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => incrementViewMutation.mutate({ id: doc.id, count: doc.view_count || 0 })}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-2 mt-4">
            {/* 기존 코드와 동일 */}
            {recentDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">최근 업데이트된 문서가 없습니다</p>
            </div>
          ) : (
            recentDocs.map((doc, idx) => (
              <div key={doc.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-slate-800">{doc.page_title}</h4>
                    {doc.last_updated && (
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(doc.last_updated).toLocaleString('ko-KR')}
                      </p>
                    )}
                  </div>
                  {doc.page_url && (
                    <a
                      href={doc.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => incrementViewMutation.mutate({ id: doc.id, count: doc.view_count || 0 })}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}