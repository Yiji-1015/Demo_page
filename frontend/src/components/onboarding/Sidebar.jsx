import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Link2, CheckCircle2, XCircle, Folder, Filter, Brain,
  Database, Loader2, Star, BookMarked
} from 'lucide-react';
import ChatHistory from './ChatHistory';

// ✅ 리팩토링의 핵심: 만들어둔 훅 가져오기
import { useOnboarding } from "../../hooks/useOnboarding";

export default function Sidebar(props) {
  // 모든 로직과 상태를 훅에서 가져옵니다.
  const {
    formData, setFormData,
    loading,
    selectedLevel1, setSelectedLevel1,
    selectedLevel2, setSelectedLevel2,
    handleConfluenceConnect,
    handleLoadCategories,
    handleFilterPages,
    handleInitializeEmbedding,
    handleEmbedPages,
    handleGetCollectionInfo
  } = useOnboarding(props);

  const [activeSection, setActiveSection] = React.useState('setup'); 

  return (
    <div className="flex flex-col h-full">
      {/* 1. 상단 탭 섹션 */}
      <div className="flex border-b border-gray-200/50 bg-gray-50/50">
        <TabButton 
          active={activeSection === 'setup'} 
          onClick={() => setActiveSection('setup')}
          icon={<BookMarked className="w-3.5 h-3.5" />}
          label="설정"
        />
        <TabButton 
          active={activeSection === 'history'} 
          onClick={() => setActiveSection('history')}
          icon={<Star className="w-3.5 h-3.5" />}
          label="채팅 내역"
        />
      </div>

      {/* 2. 메인 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'setup' ? (
          <div className="p-5">
            <div className="grid grid-cols-2 gap-6">
              {/* 왼쪽 열: 연결 및 설정 */}
              <div className="space-y-6">
                <BackendStatus connected={props.backendConnected} />
                
                <section className="space-y-4">
                  <SectionTitle icon={<Link2 />} title="Confluence 연결" />
                  <div className="space-y-3">
                    <Field label="Confluence URL" value={formData.base_url} onChange={(v) => setFormData({...formData, base_url: v})} />
                    <Field label="이메일" value={formData.email} onChange={(v) => setFormData({...formData, email: v})} />
                    <Field label="API 토큰" type="password" value={formData.api_token} onChange={(v) => setFormData({...formData, api_token: v})} />
                    <Field label="Space Key" value={formData.space_key} onChange={(v) => setFormData({...formData, space_key: v})} />
                    
                    <ActionButton 
                      onClick={handleConfluenceConnect} 
                      loading={loading.confluence} 
                      disabled={!props.backendConnected}
                      icon={<Link2 className="w-4 h-4" />}
                      label="Confluence 연결"
                    />
                  </div>
                </section>
              </div>

              {/* 오른쪽 열: 데이터 처리 */}
              <div className="space-y-6">
                <section className="space-y-4">
                  <SectionTitle icon={<Folder />} title="카테고리 선택" />
                  <ActionButton 
                    onClick={handleLoadCategories} 
                    loading={loading.categories} 
                    disabled={!props.confluenceConnected}
                    variant="outline"
                    icon={<Folder className="w-4 h-4" />}
                    label="카테고리 불러오기"
                  />

                  {props.categoriesLoaded && (
                    <div className="space-y-3">
                      <CategorySelect label="대분류" value={selectedLevel1} onChange={setSelectedLevel1} options={props.categoriesData?.categories?.level_1} />
                      <CategorySelect label="중분류" value={selectedLevel2} onChange={setSelectedLevel2} options={props.categoriesData?.categories?.level_2} />
                      <ActionButton onClick={handleFilterPages} loading={loading.filter} variant="outline" icon={<Filter className="w-4 h-4" />} label="페이지 필터링" />
                      {props.filteredPageIds.length > 0 && <Badge variant="outline" className="w-full justify-center">{props.filteredPageIds.length}개 선택됨</Badge>}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <SectionTitle icon={<Brain />} title="임베딩" />
                  <ActionButton onClick={handleInitializeEmbedding} loading={loading.init} variant="outline" icon={<Brain className="w-4 h-4" />} label="임베딩 초기화" />
                  
                  {props.embeddingInitialized && props.collectionInfo && (
                    <div className="p-3.5 rounded-xl bg-gray-100/80 border-0 text-[13px]">
                      <div className="flex items-center gap-2 text-gray-700 mb-1">
                        <Database className="w-3.5 h-3.5" /> <span className="font-medium">현재 저장된 문서</span>
                      </div>
                      <p className="text-gray-900 font-semibold text-[20px]">{props.collectionInfo.points_count}개</p>
                    </div>
                  )}

                  <ActionButton 
                    onClick={handleEmbedPages} 
                    loading={loading.embed} 
                    disabled={!props.embeddingInitialized || props.filteredPageIds.length === 0}
                    icon={<Brain className="w-4 h-4" />}
                    label="선택한 페이지 임베딩"
                  />
                </section>
              </div>
            </div>
          </div>
        ) : (
          <ChatHistory {...props} />
        )}
      </div>
    </div>
  );
}

// --- 하위 컴포넌트들 (파일 아래쪽에 두거나 별도 파일로 분리) ---

const TabButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 px-4 py-3 text-[13px] font-medium transition-all ${active ? 'text-gray-900 border-b-2 border-gray-900 bg-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>
    {icon} <span className="ml-2">{label}</span>
  </button>
);

const BackendStatus = ({ connected }) => (
  <div className={`p-4 rounded-xl border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] ${connected ? 'bg-green-50/80' : 'bg-red-50/80'}`}>
    <div className="flex items-center gap-2.5 mb-1">
      {connected ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
      <span className={`font-medium text-[13px] ${connected ? 'text-green-800' : 'text-red-800'}`}>{connected ? '백엔드 연결됨' : '백엔드 연결 실패'}</span>
    </div>
    <p className="text-[11px] text-gray-500">API Server Status</p>
  </div>
);

const SectionTitle = ({ icon, title }) => (
  <div className="flex items-center gap-2.5">
    {React.cloneElement(icon, { className: "w-4 h-4 text-gray-700" })}
    <h3 className="font-semibold text-gray-900 text-[14px]">{title}</h3>
  </div>
);

const Field = ({ label, value, onChange, type = "text" }) => (
  <div>
    <label className="text-[12px] font-medium text-gray-700 mb-1.5 block">{label}</label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-[13px] rounded-lg bg-gray-50/50" />
  </div>
);

const ActionButton = ({ onClick, loading, label, icon, variant = "default", disabled = false }) => (
  <Button onClick={onClick} disabled={loading || disabled} variant={variant} className={`w-full h-10 text-[13px] font-medium rounded-lg ${variant === 'default' ? 'bg-gray-900 text-white' : ''}`}>
    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : icon}
    <span className="ml-2">{loading ? '처리 중...' : label}</span>
  </Button>
);

const CategorySelect = ({ label, value, onChange, options = [] }) => (
  <div>
    <label className="text-sm font-medium text-slate-700 mb-1 block">{label}</label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="전체">전체</SelectItem>
        {options.map((opt, idx) => <SelectItem key={idx} value={opt}>{opt}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);