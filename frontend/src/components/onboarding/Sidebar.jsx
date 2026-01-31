import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Link2, CheckCircle2, XCircle, Folder, Filter, Brain,
  Database, Loader2, Star, BookMarked
} from 'lucide-react';
import { toast } from 'sonner';
import ChatHistory from './ChatHistory';

// ✅ 수정 1: API Client 가져오기 (경로 확인 필수!)
import client from '../../api/client';

export default function Sidebar({
  backendConnected,
  confluenceConnected,
  setConfluenceConnected,
  confluenceConfig,
  setConfluenceConfig,
  categoriesLoaded,
  setCategoriesLoaded,
  categoriesData,
  setCategoriesData,
  filteredPageIds,
  setFilteredPageIds,
  embeddingInitialized,
  setEmbeddingInitialized,
  collectionInfo,
  setCollectionInfo,
  chatSessions,
  currentSessionId,
  onCreateSession,
  onLoadSession,
  onDeleteSession
}) {
  const [formData, setFormData] = useState({
    base_url: 'https://your-domain.atlassian.net/wiki', // ✅ 범용 도메인으로 변경
    email: 'user@example.com',                        // ✅ 범용 이메일로 변경
    api_token: '',
    space_key: ''                                     // ✅ 빈 값으로 두거나 'SPACE_KEY'로 변경
  });
  const [loading, setLoading] = useState({});
  const [selectedLevel1, setSelectedLevel1] = useState('전체');
  const [selectedLevel2, setSelectedLevel2] = useState('전체');

  const setLoadingState = (key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  // ✅ 수정 2: Confluence 연결 (fetch -> client.post)
  const handleConfluenceConnect = async () => {
    if (!formData.api_token) {
      toast.error('API 토큰을 입력해주세요');
      return;
    }

    setLoadingState('confluence', true);
    try {
      // client.post는 주소를 알아서 찾아갑니다.
      const response = await client.post('/api/confluence/connect', formData);

      // axios는 response.data에 결과가 들어있습니다.
      const data = response.data;
      
      setConfluenceConnected(true);
      setConfluenceConfig(formData);
      toast.success(data.message || `연결 성공! (${data.page_count}개 페이지)`);
    } catch (error) {
      console.error("Confluence 연결 실패:", error);
      const errorMessage = error.response?.data?.detail || '백엔드 서버에 연결할 수 없습니다';
      toast.error(errorMessage);
    } finally {
      setLoadingState('confluence', false);
    }
  };

  // ✅ 수정 3: 카테고리 불러오기
  const handleLoadCategories = async () => {
    if (!confluenceConfig) return;

    setLoadingState('categories', true);
    try {
      const response = await client.post('/api/confluence/categories', confluenceConfig);
      const data = response.data; // .json() 불필요

      setCategoriesData(data);
      setCategoriesLoaded(true);
      toast.success(`${data.total_pages}개 페이지 로드 완료!`);
    } catch (error) {
      console.error("카테고리 로드 실패:", error);
      const errorMessage = error.response?.data?.detail || '카테고리를 불러올 수 없습니다';
      toast.error(errorMessage);
    } finally {
      setLoadingState('categories', false);
    }
  };

  // ✅ 수정 4: 페이지 필터링
  const handleFilterPages = async () => {
    if (!confluenceConfig) return;

    setLoadingState('filter', true);
    const params = new URLSearchParams();
    if (selectedLevel1 !== '전체') params.append('level_1', selectedLevel1);
    if (selectedLevel2 !== '전체') params.append('level_2', selectedLevel2);

    try {
      // 쿼리 파라미터도 주소 뒤에 붙여서 보냅니다.
      const response = await client.post(`/api/confluence/filter-pages?${params}`, confluenceConfig);
      const data = response.data;

      setFilteredPageIds(data.page_ids);
      toast.success(`${data.count}개 페이지 필터링 완료`);
    } catch (error) {
      console.error("필터링 실패:", error);
      const errorMessage = error.response?.data?.detail || '페이지 필터링 실패';
      toast.error(errorMessage);
    } finally {
      setLoadingState('filter', false);
    }
  };

  // ✅ 수정 5: 임베딩 초기화
  const handleInitializeEmbedding = async () => {
    setLoadingState('init', true);
    try {
      const response = await client.post('/api/embedding/initialize');
      const data = response.data;

      setEmbeddingInitialized(true);
      setCollectionInfo(data.collection_info);
      toast.success(data.message || '임베딩 초기화 완료');
    } catch (error) {
      console.error("초기화 실패:", error);
      const errorMessage = error.response?.data?.detail || '.env 파일 확인 필요';
      toast.error(errorMessage);
    } finally {
      setLoadingState('init', false);
    }
  };

  // ✅ 수정 6: 페이지 임베딩
  const handleEmbedPages = async () => {
    if (!confluenceConfig || filteredPageIds.length === 0) return;

    setLoadingState('embed', true);
    try {
      const response = await client.post('/api/embedding/embed-pages', {
        ...confluenceConfig,
        page_ids: filteredPageIds.map(id => String(id))
      });
      const data = response.data;

      toast.success(data.message || `${data.embedded_pages}개 페이지 임베딩 완료`);
    } catch (error) {
      console.error("임베딩 실패:", error);
      const errorMessage = error.response?.data?.detail || '페이지 임베딩 실패';
      toast.error(errorMessage);
    } finally {
      setLoadingState('embed', false);
    }
  };

  // ✅ 수정 7: 컬렉션 정보 조회 (GET 요청)
  const handleGetCollectionInfo = async () => {
    setLoadingState('info', true);
    try {
      // GET 요청은 client.get을 사용합니다.
      const response = await client.get('/api/collection/info');
      const data = response.data;

      setCollectionInfo(data.collection_info);
      toast.success('컬렉션 정보 조회 완료');
    } catch (error) {
      console.error("정보 조회 실패:", error);
      const errorMessage = error.response?.data?.detail || '컬렉션 정보 조회 실패';
      toast.error(errorMessage);
    } finally {
      setLoadingState('info', false);
    }
  };

  const [activeSection, setActiveSection] = React.useState('setup'); 

  return (
    <div className="flex flex-col h-full">
      {/* 섹션 전환 탭 */}
      <div className="flex border-b border-gray-200/50 bg-gray-50/50">
        <button
          onClick={() => setActiveSection('setup')}
          className={`flex-1 px-4 py-3 text-[13px] font-medium transition-all ${
            activeSection === 'setup'
              ? 'text-gray-900 border-b-2 border-gray-900 bg-white'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5 inline mr-2" />
          설정
        </button>
        <button
          onClick={() => setActiveSection('history')}
          className={`flex-1 px-4 py-3 text-[13px] font-medium transition-all ${
            activeSection === 'history'
              ? 'text-gray-900 border-b-2 border-gray-900 bg-white'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
          }`}
        >
          <Star className="w-3.5 h-3.5 inline mr-2" />
          채팅 내역
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'setup' ? (
          <div className="p-5">
            {/* 2단 그리드 레이아웃 */}
            <div className="grid grid-cols-2 gap-6">
            {/* 왼쪽 열 */}
            <div className="space-y-6">
              {/* Backend Status */}
              <div className={`p-4 rounded-xl border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] ${
                backendConnected 
                  ? 'bg-green-50/80' 
                  : 'bg-red-50/80'
              }`}>
                <div className="flex items-center gap-2.5 mb-1">
                  {backendConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`font-medium text-[13px] ${
                    backendConnected ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {backendConnected ? '백엔드 연결됨' : '백엔드 연결 실패'}
                  </span>
                </div>
                {/* 주소 표시 업데이트 (변수 사용하면 더 좋지만 일단 하드코딩 제거) */}
                <p className="text-[11px] text-gray-500">API Server Connected</p>
              </div>

              {/* Confluence Connection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Link2 className="w-4 h-4 text-gray-700" />
                  <h3 className="font-semibold text-gray-900 text-[14px]">Confluence 연결</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] font-medium text-gray-700 mb-1.5 block">Confluence URL</label>
                    <Input
                      value={formData.base_url}
                      onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                      placeholder="https://your-domain.atlassian.net/wiki"
                      className="h-9 bg-gray-50/50 border-gray-200/60 focus:bg-white focus:border-gray-300 focus:ring-0 text-[13px] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-gray-700 mb-1.5 block">이메일</label>
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@example.com"
                      className="h-9 bg-gray-50/50 border-gray-200/60 focus:bg-white focus:border-gray-300 focus:ring-0 text-[13px] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-gray-700 mb-1.5 block">API 토큰</label>
                    <Input
                      type="password"
                      value={formData.api_token}
                      onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                      placeholder="••••••••••••••••••"
                      className="h-9 bg-gray-50/50 border-gray-200/60 focus:bg-white focus:border-gray-300 focus:ring-0 text-[13px] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-gray-700 mb-1.5 block">Space Key</label>
                    <Input
                      value={formData.space_key}
                      onChange={(e) => setFormData({ ...formData, space_key: e.target.value })}
                      placeholder="YOUR_SPACE_KEY"
                      className="h-9 bg-gray-50/50 border-gray-200/60 focus:bg-white focus:border-gray-300 focus:ring-0 text-[13px] rounded-lg"
                    />
                  </div>

                  <Button
                    onClick={handleConfluenceConnect}
                    disabled={loading.confluence || !backendConnected}
                    className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-medium rounded-lg shadow-sm mt-2"
                  >
                    {loading.confluence ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        연결 중...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 mr-2" />
                        Confluence 연결
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* 오른쪽 열 */}
            <div className="space-y-6">
              {/* Category Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 text-gray-700" />
                  <h3 className="font-semibold text-gray-900 text-[14px]">카테고리 선택</h3>
                </div>

                <Button
                  onClick={handleLoadCategories}
                  disabled={!confluenceConnected || loading.categories}
                  variant="outline"
                  className="w-full h-9 border-gray-200 text-gray-700 hover:bg-gray-100 text-[13px] rounded-lg"
                >
                  {loading.categories ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      카테고리 불러오는 중...
                    </>
                  ) : (
                    <>
                      <Folder className="w-4 h-4 mr-2" />
                      카테고리 불러오기
                    </>
                  )}
                </Button>

                {categoriesLoaded && categoriesData && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">대분류 (Level 1)</label>
                      <Select value={selectedLevel1} onValueChange={setSelectedLevel1}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="전체">전체</SelectItem>
                          {categoriesData.categories?.level_1?.map((cat, idx) => (
                            <SelectItem key={idx} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">중분류 (Level 2)</label>
                      <Select value={selectedLevel2} onValueChange={setSelectedLevel2}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="전체">전체</SelectItem>
                          {categoriesData.categories?.level_2?.map((cat, idx) => (
                            <SelectItem key={idx} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleFilterPages}
                      disabled={!categoriesLoaded || loading.filter}
                      variant="outline"
                      className="w-full"
                    >
                      {loading.filter ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          필터링 중...
                        </>
                      ) : (
                        <>
                          <Filter className="w-4 h-4 mr-2" />
                          페이지 필터링
                        </>
                      )}
                    </Button>

                    {filteredPageIds.length > 0 && (
                      <Badge variant="outline" className="w-full justify-center">
                        {filteredPageIds.length}개 페이지 선택됨
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Embedding */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Brain className="w-4 h-4 text-gray-700" />
                  <h3 className="font-semibold text-gray-900 text-[14px]">임베딩</h3>
                </div>

                <Button
                  onClick={handleInitializeEmbedding}
                  disabled={loading.init}
                  variant="outline"
                  className="w-full h-9 border-gray-200 text-gray-700 hover:bg-gray-100 text-[13px] rounded-lg"
                >
                  {loading.init ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      초기화 중...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      임베딩 초기화
                    </>
                  )}
                </Button>

                {embeddingInitialized && collectionInfo && (
                  <div className="p-3.5 rounded-xl bg-gray-100/80 border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] text-[13px]">
                    <div className="flex items-center gap-2 text-gray-700 mb-1">
                      <Database className="w-3.5 h-3.5" />
                      <span className="font-medium">현재 저장된 문서</span>
                    </div>
                    <p className="text-gray-900 font-semibold text-[20px]">{collectionInfo.points_count}개</p>
                  </div>
                )}

                <Button
                  onClick={handleEmbedPages}
                  disabled={!embeddingInitialized || filteredPageIds.length === 0 || loading.embed}
                  className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-medium rounded-lg shadow-sm"
                >
                  {loading.embed ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      임베딩 중...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      선택한 페이지 임베딩
                    </>
                  )}
                </Button>

                <div className="border-t border-slate-200 pt-4">
                  <Button
                    onClick={handleGetCollectionInfo}
                    disabled={!embeddingInitialized || loading.info}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {loading.info ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        조회 중...
                      </>
                    ) : (
                      <>
                        <Database className="w-3 h-3 mr-2" />
                        컬렉션 정보 조회
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          </div>
        ) : (
          <ChatHistory 
            chatSessions={chatSessions}
            currentSessionId={currentSessionId}
            onCreateSession={onCreateSession}
            onLoadSession={onLoadSession}
            onDeleteSession={onDeleteSession}
          />
        )}
      </div>
    </div>
  );
}