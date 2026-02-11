import React, { useState, useEffect, useRef } from 'react'; // ✅ useRef 추가
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Cloud, Database, RefreshCw, ListChecks, AlertCircle, FileType, Upload, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { onboardingApi as client } from '@/api/client'; 

export default function DocumentManager({ confluenceConfig, setConfluenceConfig, setEmbeddingInitialized }) {
  const [activeTab, setActiveTab] = useState('connect');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fetchedPages, setFetchedPages] = useState([]);       
  const [categoryTree, setCategoryTree] = useState({});       
  const [level1List, setLevel1List] = useState([]); 
  
  const [selectedLevel1, setSelectedLevel1] = useState("all"); 
  const [selectedLevel2, setSelectedLevel2] = useState("all"); 
  const [selectedPageIds, setSelectedPageIds] = useState([]); 
  
  const [collectionInfo, setCollectionInfo] = useState(null); 
  const [isFetching, setIsFetching] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  
  // ✅ 파일 업로드용 ref 생성
  const fileInputRef = useRef(null);
  // ✅ 드래그 상태 시각효과용 state
  const [isDragging, setIsDragging] = useState(false);

  const [form, setForm] = useState({
    base_url: '', email: '', api_token: '', space_key: '' 
  });

  useEffect(() => {
    if (confluenceConfig) {
      setForm({
        base_url: confluenceConfig.base_url || '',
        email: confluenceConfig.email || '',
        api_token: confluenceConfig.api_token || '',
        space_key: confluenceConfig.space_key || ''
      });
    }
    fetchCollectionInfo();
  }, [confluenceConfig]);

  const handleSaveConfig = () => {
    if (!setConfluenceConfig) return;
    setConfluenceConfig(form);
    toast.success("설정이 저장되었습니다.");
  };

  const handleFetchPages = async () => {
    if (!form.space_key || !form.api_token) {
      toast.error("API Token과 Space Key가 필요합니다.");
      return;
    }

    setIsFetching(true);
    setFetchedPages([]);

    try {
      const payload = {
        base_url: form.base_url,
        email: form.email,
        api_token: form.api_token,
        space_key: form.space_key
      };

      const response = await client.post('/confluence/categories', payload);
      const data = response.data;
      
      if (Array.isArray(data.pages)) {
        setFetchedPages(data.pages);          
        setCategoryTree(data.category_tree);  
        setLevel1List(Object.keys(data.category_tree)); 
        
        toast.success(`성공! ${data.pages.length}개의 문서를 불러왔습니다.`);
        setActiveTab('sync'); 
      }

    } catch (error) {
      console.error("페이지 로드 실패:", error);
      toast.error("불러오기 실패: 연결 정보를 확인해주세요.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        setUploadedFiles(prev => [...prev, ...files]);
        toast.info(`${files.length}개 파일이 선택되었습니다.`);
    }
    // 같은 파일 다시 선택 가능하게 초기화
    e.target.value = null;
  };

  // ✅ 드래그 이벤트 핸들러 수정
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true); // 시각 효과 On
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false); // 시각 효과 Off
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        const validFiles = files.filter(f => 
            f.name.toLowerCase().endsWith('.pdf') || 
            f.name.toLowerCase().endsWith('.txt') || 
            f.name.toLowerCase().endsWith('.md')
        );

        if (validFiles.length > 0) {
            setUploadedFiles(prev => [...prev, ...validFiles]);
            toast.info(`${validFiles.length}개 파일이 추가되었습니다.`);
        } else {
            toast.warning("지원하지 않는 파일 형식입니다. (PDF, TXT만 가능)");
        }
    }
  };

  // ✅ 박스 클릭 시 숨겨진 Input 클릭 트리거
  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleStartFileUpload = async () => {
    if (uploadedFiles.length === 0) {
        toast.warning("업로드할 파일을 선택해주세요.");
        return;
    }

    setIsEmbedding(true);
    toast.info("파일 분석 및 학습 시작...");

    try {
        const formData = new FormData();
        uploadedFiles.forEach((file) => {
            formData.append('files', file);
        });

        await client.post('/embedding/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        toast.success("파일 학습 완료!");
        setUploadedFiles([]); 
        fetchCollectionInfo(); 
        if (setEmbeddingInitialized) setEmbeddingInitialized(true);
        setActiveTab('manage');

    } catch (error) {
        console.error("업로드 실패:", error);
        toast.error("업로드 실패: " + (error.response?.data?.detail || error.message));
    } finally {
        setIsEmbedding(false);
    }
  };

  const handleLevel1Change = (val) => {
    setSelectedLevel1(val);
    setSelectedLevel2("all"); 
  };
  
  const filteredPages = fetchedPages.filter(page => {
    if (selectedLevel1 === "all") return true;
    if (!page.path.includes(selectedLevel1)) return false;
    if (selectedLevel2 === "all") return true;
    return page.path.includes(selectedLevel2);
  });

  const handleStartEmbedding = async () => {
    if (selectedPageIds.length === 0) {
      toast.warning("임베딩할 문서를 선택해주세요.");
      return;
    }
    setIsEmbedding(true);
    toast.info("임베딩을 시작합니다...");

    try {
      await client.post('/embedding/initialize');
      const payload = {
        base_url: form.base_url,
        email: form.email,
        api_token: form.api_token,
        space_key: form.space_key,
        page_ids: selectedPageIds,
        collection_name: "confluence_docs"
      };
      await client.post('/embedding/embed-pages', payload);
      
      toast.success("임베딩 완료! 이제 채팅이 가능합니다.");
      if (setEmbeddingInitialized) setEmbeddingInitialized(true);

      fetchCollectionInfo(); 
      setActiveTab('manage');
    } catch (error) {
      toast.error("임베딩 실패: " + error.message);
    } finally {
      setIsEmbedding(false);
    }
  };

  const fetchCollectionInfo = async () => {
      try {
          const res = await client.get('/collection/info');
          setCollectionInfo(res.data.collection_info);
          if (res.data.collection_info.points_count > 0 && setEmbeddingInitialized) {
            setEmbeddingInitialized(true);
          }
      } catch (error) {
          if (error.response && error.response.status === 400) {
              setCollectionInfo(null); 
              return; 
          }
          console.warn("컬렉션 정보 조회 실패:", error);
      }
  };

  const togglePageSelection = (pageId) => {
    const id = String(pageId); 
    setSelectedPageIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };
  
  const handleSelectFiltered = () => {
    const visibleIds = filteredPages.map(p => String(p.id));
    const allSelected = visibleIds.every(id => selectedPageIds.includes(id));
    if (allSelected) {
      setSelectedPageIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedPageIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">지식 베이스 관리자</h2>
        <p className="text-muted-foreground">백엔드 API와 통신합니다.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="connect">1. 데이터 소스 연결</TabsTrigger>
          <TabsTrigger value="sync">2. 데이터 선택 및 임베딩</TabsTrigger>
          <TabsTrigger value="manage">3. 임베딩 현황 확인</TabsTrigger>
        </TabsList>

        <TabsContent value="connect" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Cloud className="w-5 h-5 text-blue-500"/> Confluence 연결</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input name="base_url" value={form.base_url} onChange={(e)=>setForm({...form, [e.target.name]: e.target.value})} placeholder="URL" />
                  <Input name="email" value={form.email} onChange={(e)=>setForm({...form, [e.target.name]: e.target.value})} placeholder="Email" />
                  <Input name="api_token" type="password" value={form.api_token} onChange={(e)=>setForm({...form, [e.target.name]: e.target.value})} placeholder="API Token" />
                  <Input name="space_key" value={form.space_key} onChange={(e)=>setForm({...form, [e.target.name]: e.target.value})} placeholder="Space Key" />
                  <div className="flex gap-2">
                      <Button className="flex-1" variant="outline" onClick={handleSaveConfig}>설정 저장</Button>
                      <Button className="flex-1" onClick={handleFetchPages} disabled={isFetching}>
                          {isFetching ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>} 목록 불러오기
                      </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ✅ 수정된 파일 업로드 카드 */}
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileType className="w-5 h-5 text-orange-500"/> 파일 업로드</CardTitle>
                    <CardDescription>여기에 파일을 드래그하거나 클릭하세요.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* ✅ 진짜 Input은 숨김 */}
                    <input 
                        type="file" 
                        multiple 
                        accept=".pdf,.txt,.md" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    
                    {/* ✅ 드래그 영역 (Input이 덮지 않음) */}
                    <div 
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer relative mb-4 
                            ${isDragging ? 'bg-blue-50 border-blue-500' : 'hover:bg-slate-50 border-slate-200'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleBoxClick} // 클릭 시 ref를 통해 input 클릭
                    >
                        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
                        <p className="text-sm font-medium text-slate-700">
                            {isDragging ? "여기에 놓으세요!" : "클릭 또는 파일 드래그앤드롭"}
                            <br/>
                            <span className="text-xs text-slate-400 font-normal">(PDF, TXT, MD 지원)</span>
                        </p>
                    </div>

                    {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">{uploadedFiles.length}개 파일 대기 중</p>
                            <div className="max-h-32 overflow-y-auto text-xs text-slate-500 border rounded p-2">
                                {uploadedFiles.map((f, i) => <div key={i}>{f.name}</div>)}
                            </div>
                            <Button onClick={handleStartFileUpload} disabled={isEmbedding} className="w-full mt-2">
                                {isEmbedding ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
                                파일 학습 시작
                            </Button>
                        </div>
                    )}
                </CardContent>
              </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
           <Card className="h-[600px] flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListChecks className="w-5 h-5 text-purple-500"/> 임베딩 대상 선택</CardTitle>
                <CardDescription>총 {fetchedPages.length}개 문서 중 임베딩할 항목을 선택하세요.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
                <div className="flex gap-4 p-4 bg-slate-50 rounded-lg border">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">1단계 분류</label>
                        <Select value={selectedLevel1} onValueChange={handleLevel1Change}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="전체" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">전체 보기</SelectItem>
                                {level1List.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium">2단계 분류</label>
                        <Select value={selectedLevel2} onValueChange={setSelectedLevel2} disabled={selectedLevel1 === "all"}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="전체" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">전체 보기</SelectItem>
                                {selectedLevel1 !== "all" && categoryTree[selectedLevel1] && 
                                    Object.keys(categoryTree[selectedLevel1]).map(sub => <SelectItem key={sub} value={sub}>{sub}</SelectItem>)
                                }
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex-1 border rounded-md overflow-y-auto p-2 space-y-1">
                    <div className="flex items-center justify-between px-2 py-2 border-b bg-slate-50 mb-2 sticky top-0 z-10">
                        <span className="text-sm font-medium text-slate-600">
                            필터링된 {filteredPages.length}개 중 {selectedPageIds.filter(id => filteredPages.some(p => String(p.id) === id)).length}개 선택됨
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={handleSelectFiltered}>현재 목록 전체 선택/해제</Button>
                    </div>
                    {filteredPages.map((page) => (
                        <div key={page.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded cursor-pointer" onClick={() => togglePageSelection(page.id)}>
                            <input type="checkbox" className="h-4 w-4" checked={selectedPageIds.includes(String(page.id))} onChange={() => {}} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">{page.title}</p>
                                <p className="text-xs text-slate-500">{page.path}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="pt-2 border-t flex justify-end">
                    <Button onClick={handleStartEmbedding} disabled={selectedPageIds.length === 0 || isEmbedding}>
                        {isEmbedding ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
                        선택한 {selectedPageIds.length}개 문서 임베딩 시작
                    </Button>
                </div>
            </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="manage">
           <Card>
               <CardHeader><CardTitle>임베딩 현황</CardTitle></CardHeader>
               <CardContent>
                   {collectionInfo ? (
                       <div className="p-4 bg-slate-100 rounded-lg text-center">
                           <p className="text-sm text-slate-500">총 임베딩된 벡터 수</p>
                           <p className="text-3xl font-bold text-blue-600">{collectionInfo.points_count}</p>
                           <div className="mt-4 flex gap-2 justify-center">
                               <Button variant="outline" size="sm" onClick={fetchCollectionInfo}>새로고침</Button>
                           </div>
                       </div>
                   ) : <div className="text-center py-4">데이터 조회 중...</div>}
               </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}