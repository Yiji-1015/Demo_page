import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, FileText, Folder, ChevronRight, ChevronDown, 
  CheckCircle2, RefreshCw, Server, CheckSquare, Square, Play,
  List, X, ExternalLink
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; 
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { onboardingApi } from '../../api/client';

// ----------------------------------------------------------------------
// ✂️ 긴 텍스트를 중간 생략으로 보여주는 컴포넌트
// ----------------------------------------------------------------------
const MiddleEllipsis = ({ text = "", head = 20, tail = 15, className = "" }) => {
  const s = String(text);
  if (s.length <= head + tail + 3) return <span className={className}>{s}</span>;
  return (
    <span className={className} title={s}>
      {s.slice(0, head)}…{s.slice(-tail)}
    </span>
  );
};

// ----------------------------------------------------------------------
// 🌳 1. 트리 노드 컴포넌트
// ----------------------------------------------------------------------
const TreeNode = ({ node, level = 0, selectedIds, onToggleSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMaxLevel = level >= 2;
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === 'folder' || hasChildren;
  const isIndexed = node.is_indexed;
  const isSelected = selectedIds.has(node.id);

  const handleExpandClick = (e) => {
    e.stopPropagation();
    if (isFolder && !isMaxLevel) setIsOpen(!isOpen);
  };

  return (
    <div className="select-none min-w-0">
      <div 
        className={`flex items-center py-2 px-2 rounded-md transition-colors group
          ${isIndexed ? 'cursor-default opacity-90' : 'cursor-pointer hover:bg-gray-100'}
          ${isSelected ? 'bg-blue-50' : ''} 
          ${isIndexed ? 'bg-green-50/40' : ''}`}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        onClick={() => !isIndexed && onToggleSelect(node)}
      >
        <div className="mr-1 text-gray-400 w-5 flex-shrink-0 flex justify-center cursor-pointer" onClick={handleExpandClick}>
          {isFolder && !isMaxLevel ? (isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <div className="w-4" />}
        </div>
        
        <div className="mr-2 flex-shrink-0">
          {isIndexed ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" /> 
          ) : (
            <div className={`${isSelected ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400'}`}>
              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </div>
          )}
        </div>

        <div className={`mr-2 flex-shrink-0 ${isIndexed ? 'text-green-700' : 'text-gray-400'}`}>
          {isFolder ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <MiddleEllipsis 
            text={node.title} 
            className={`text-sm block truncate ${isIndexed ? 'text-green-900 font-bold' : 'text-gray-600'}`} 
          />
        </div>
      </div>

      {isOpen && !isMaxLevel && node.children && (
        <div className="border-l border-gray-100 ml-4">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 🧠 2. 메인 사이드바 컴포넌트
// ----------------------------------------------------------------------
export default function Sidebar({ stats = {}, backendConnected: propConnected }) {
  const [totalDocs, setTotalDocs] = useState(0);
  
  // 🌟 1. 시스템 정보 상태를 객체로 초기화 (기본값 설정)
  const [systemInfo, setSystemInfo] = useState({
    email: 'Loading...',
    workspaceName: 'Loading...',
    initial: 'L'
  });
  
  const [treeData, setTreeData] = useState([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  
  // 모달 관련 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dbDocsList, setDbDocsList] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        // 🌟 2. 백엔드에서 정보 가져와서 예쁘게 파싱하기
        const sysRes = await onboardingApi.get('/system/status');
        const { email, confluence_url } = sysRes.data;

        let parsedWorkspace = "Unknown Portal";
        let parsedInitial = "U";

        if (confluence_url) {
          // 정규식으로 https://lloydk.atlassian.net 에서 'lloydk'만 추출!
          const match = confluence_url.match(/https?:\/\/([^.]+)\.atlassian\.net/);
          if (match && match[1]) {
            parsedWorkspace = match[1].toUpperCase(); // LLOYDK Portal
            parsedInitial = match[1].charAt(0).toUpperCase();     // L
          }
        }

        // 상태 업데이트
        setSystemInfo({
          email: email || "이메일 정보 없음",
          workspaceName: parsedWorkspace,
          initial: parsedInitial
        });

        fetchTreeData();
        fetchRealDbCount();
      } catch (e) { 
        console.error(e); 
        setSystemInfo({ email: "Error", workspaceName: "Connection Failed", initial: "!" });
      }
    };
    initData();
  }, []);

  const fetchRealDbCount = async () => {
    setIsLoadingDb(true);
    try {
      const res = await onboardingApi.get('/documents/embedded');
      const result = res.data || res; 
      
      if (result && result.status === 'success') {
        setDbDocsList(result.data || []);
        setTotalDocs(result.total_count || 0);
      }
    } catch (e) {
      console.error("❌ DB 문서 목록 불러오기 실패:", e);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const processDemoData = (nodes, forceIndex = false) => {
    let count = 0;
    const processedNodes = nodes.map(node => {
      const isTarget = node.title === "LLOYDK에 오신 걸 환영합니다!";
      const shouldBeIndexed = forceIndex || isTarget || node.is_indexed;
      if (node.type === 'page' && shouldBeIndexed) count++;
      let newChildren = node.children;
      let childCount = 0;
      if (node.children) {
        const result = processDemoData(node.children, shouldBeIndexed);
        newChildren = result.nodes;
        childCount = result.count;
      }
      return { node: { ...node, is_indexed: shouldBeIndexed, children: newChildren }, count: (node.type === 'page' && shouldBeIndexed ? 1 : 0) + childCount };
    });
    return { nodes: processedNodes.map(p => p.node), count: processedNodes.reduce((acc, curr) => acc + curr.count, 0) };
  };

  const fetchTreeData = async () => {
    setIsLoadingTree(true);
    try {
      const response = await onboardingApi.get('/documents/structure');
      const { nodes } = processDemoData(response.data);
      setTreeData(nodes);
    } catch (e) { console.error(e); } 
    finally { setIsLoadingTree(false); }
  };

  const selectedPageInfo = useMemo(() => {
    const pages = [];
    const traverse = (nodes) => {
      nodes.forEach(node => {
        if (selectedIds.has(node.id) && node.type === 'page') pages.push(node.title);
        if (node.children) traverse(node.children);
      });
    };
    traverse(treeData);
    return pages;
  }, [selectedIds, treeData]);

  const handleToggleSelect = (node) => {
    const newSelected = new Set(selectedIds);
    const getUnindexedIds = (n) => {
      let ids = [];
      if (!n.is_indexed || n.type === 'folder') ids.push(n.id);
      if (n.children) n.children.forEach(c => ids = [...ids, ...getUnindexedIds(c)]);
      return ids;
    };
    const getAllIds = (n) => {
      let ids = [n.id];
      if (n.children) n.children.forEach(c => ids = [...ids, ...getAllIds(c)]);
      return ids;
    };

    if (newSelected.has(node.id)) {
      getAllIds(node).forEach(id => newSelected.delete(id));
    } else {
      getUnindexedIds(node).forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  const handleStartSync = () => {
    if (selectedPageInfo.length === 0) return;
    setIsSyncing(true);
    setProgress(0);
    const syncIds = new Set(selectedIds);
    const totalToSync = selectedPageInfo.length;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          
          setTreeData(prevTree => {
            const update = (nodes) => nodes.map(n => ({
              ...n,
              is_indexed: n.is_indexed || syncIds.has(n.id),
              children: n.children ? update(n.children) : n.children
            }));
            return update(prevTree);
          });
          toast.success("임베딩 완료!");
          setSelectedIds(new Set());
          
          fetchRealDbCount(); 
          
          return 100;
        }

        const fileIndex = Math.min(Math.floor((prev / 100) * totalToSync), totalToSync - 1);
        const currentTitle = selectedPageInfo[fileIndex];
        const subStatus = prev % 3 === 0 ? "분석 중..." : (prev % 3 === 1 ? "추출 중..." : "벡터화 중...");
        setCurrentFile(`[${fileIndex + 1}/${totalToSync}] ${currentTitle} - ${subStatus}`);

        return prev + (100 / (totalToSync * 3));
      });
    }, 120);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-slate-50 min-w-0">
        
        {/* 🌟 3. 하드코딩 제거된 Connection 영역 */}
        <div className="p-4 border-b border-slate-200 bg-white flex-shrink-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <Server className="w-3 h-3" /> Connection
          </h3>
          <Card className="p-3 bg-slate-50 border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200 flex-shrink-0">
                {systemInfo.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {systemInfo.workspaceName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {systemInfo.email}
                </p>
              </div>
          </Card>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 flex-shrink-0"><Folder className="w-3 h-3" /> Documents</h3>
              {selectedPageInfo.length > 0 && <Badge className="bg-blue-100 text-blue-700 border-0 h-5 px-1.5 flex-shrink-0">{selectedPageInfo.length} docs</Badge>}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => { fetchTreeData(); fetchRealDbCount(); }}>
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoadingTree ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="min-w-0">
              {treeData.length === 0 ? <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs text-center px-4">데이터 로드 중...</div> : 
                treeData.map(node => <TreeNode key={node.id} node={node} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} />)}
            </div>
          </ScrollArea>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4 flex-shrink-0">
          {isSyncing ? (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
              <div className="flex justify-between text-xs font-medium text-slate-600"><span className="flex items-center gap-1.5 text-blue-600"><RefreshCw className="w-3 h-3 animate-spin" /> Embedding...</span><span>{Math.round(progress)}%</span></div>
              <div className="text-[11px] text-slate-500 truncate h-4 font-mono font-medium">
                 {currentFile}
              </div>
              <Progress value={progress} className="h-2 bg-slate-200" />
            </div>
          ) : (
            <Button onClick={handleStartSync} disabled={selectedPageInfo.length === 0} className={`w-full shadow-md transition-all active:scale-95 ${selectedPageInfo.length > 0 ? 'bg-slate-900 hover:bg-slate-800 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              <Play className="w-4 h-4 mr-2 fill-current" /> {selectedPageInfo.length > 0 ? `${selectedPageInfo.length}개 문서 임베딩 시작` : '새로 학습할 문서가 없습니다'}
            </Button>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
            <div className="flex items-center gap-2 text-slate-500 flex-shrink-0">
              <Database className="w-4 h-4" />
              <span className="text-xs font-medium">Total DB</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-slate-700 truncate">
                {isLoadingDb ? '...' : totalDocs.toLocaleString()} <span className="text-xs font-normal text-slate-400">docs</span>
              </span>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-6 w-6 ml-1 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                onClick={() => setIsModalOpen(true)}
                title="임베딩된 문서 목록 확인"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800">임베딩된 문서 목록 <Badge variant="secondary" className="ml-2">{totalDocs}개</Badge></h2>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/30">
              {isLoadingDb ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> 데이터를 불러오는 중...
                </div>
              ) : dbDocsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-20">
                  <Database className="w-10 h-10 mb-3 text-slate-200" />
                  DB에 저장된 문서가 없습니다.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-100/80 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Space</th>
                      <th className="px-4 py-3 font-semibold">제목</th>
                      <th className="px-4 py-3 font-semibold">작성자</th>
                      <th className="px-4 py-3 font-semibold w-1/2">본문 미리보기 (첫 50자)</th>
                      <th className="px-4 py-3 font-semibold text-center">링크</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dbDocsList.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors bg-white">
                        <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">{doc.space}</td>
                        <td className="px-4 py-3 text-slate-900 font-medium">{doc.title}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{doc.primary_contributor || '작성자 없음'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {doc.content_preview || "내용 없음"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full text-blue-600 hover:bg-blue-100 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}