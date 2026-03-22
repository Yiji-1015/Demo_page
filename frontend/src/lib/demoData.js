import {
  BookOpen, Users, Mic, FileText, Search, Inbox, AlertTriangle, Package,
  Brain, Shield, BarChart3, HelpCircle,
  Headphones, ClipboardCopy, TrendingUp, Monitor
} from "lucide-react";

export const ICON_MAP = {
  "book-open": BookOpen,
  users: Users,
  mic: Mic,
  "file-text": FileText,
  search: Search,
  inbox: Inbox,
  "alert-triangle": AlertTriangle,
  package: Package,
  brain: Brain,
  shield: Shield,
  chart: BarChart3,
  monitor: Monitor
};

export const normalizeIconKey = (icon) => {
  if (typeof icon !== "string") return "";
  // BookOpen / book_open / book-open 모두 대응
  return icon
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
};

export const getIconComponent = (icon) => {
  const key = normalizeIconKey(icon);
  return ICON_MAP[key] ?? HelpCircle;
};


// ★ 1. 카테고리 정보 (여기서 이름, 아이콘, 색상 통합 관리)
export const CATEGORY_INFO = {
  employee: { 
    label: '임직원 공통 서비스', 
    icon: Users, 
    color: 'bg-blue-50 border-blue-200 text-blue-700' 
  },
  customer: { 
    label: '음성 및 영상 관련 업무 자동화', 
    icon: Headphones, 
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700' 
  },
  security: { 
    label: '템플릿 기반 문서 자동화', 
    icon: ClipboardCopy,  
    color: 'bg-red-50 border-red-200 text-red-700' 
  },
  management: { 
    label: '산업•업무 특화 영역', 
    icon: TrendingUp, 
    color: 'bg-purple-50 border-purple-200 text-purple-700' 
  },
};

// ★ 2. 데모 데이터 리스트
export const STATIC_DEMOS = [
  // 1. 임직원 공통 서비스
  { 
    id: 1, 
    title: '신입사원 온보딩 서비스', 
    description: '신입사원이 회사 생활에 빠르게 적응할 수 있도록 돕는 AI 챗봇입니다.',
    category: 'employee', 
    status: 'completed', 
    icon: 'book-open', 
    expected_date: null 
  },
  { 
    id: 2, 
    title: '인천공항 협업 포털/대전환 사규 사칙 챗봇', 
    description: '인천공항',
    category: 'employee', 
    status: 'completed', 
    icon: 'LayoutDashboard',
    external_link: 'https://aiportal.lloydk.co.kr/',
    expected_date: null 
  },

  { 
    id: 9, 
    title: 'LK Admin', 
    description: 'LK Admin',
    category: 'employee', 
    status: 'completed', 
    icon: 'monitor',
    external_link: 'https://rag-admin.lloydk.ai/',
    expected_date: null 
  },

  // 2. 음성 및 영상 관련 업무 자동화
  { 
    id: 3, 
    title: '회의록 자동화(STT 및 영어 번역)', 
    description: '영어 번역함',
    category: 'customer', 
    status: 'completed', 
    icon: 'mic',
    external_link: 'https://iiac-demo.lloydk.ai/dashboard/smart-workflow',
    expected_date: null
  },

  // 3. 템플릿 기반 문서 자동화
  { 
    id: 4, 
    title: '언론보도용 기사 초안 작성', 
    description: '기사 초안 작성해줌',
    category: 'security', 
    status: 'completed', 
    icon: 'file-text',
    external_link: 'https://iiac-demo.lloydk.ai/dashboard/smart-news',
    expected_date: null
  },

  // 3. 템플릿 기반 문서 자동화
  { 
    id: 5, 
    title: '인사이트 파인더', 
    description: '인사이트 파인드해줌',
    category: 'security', 
    status: 'completed', 
    icon: 'search',
    external_link: 'http://192.168.123.43:13000/',
    expected_date: null 
  },

  // 4. 경영 관리
  { 
    id: 6, 
    title: '민원 분류 서비스', 
    description: '민원 분류해줌.',
    category: 'management', 
    status: 'completed', 
    icon: 'inbox', 
    expected_date: null 
  },

  { 
    id: 7, 
    title: '이상행동탐지', 
    description: '이상행동탐지함',
    category: 'management', 
    status: 'completed', 
    icon: 'alert-triangle', 
    external_link: 'http://192.168.123.41:5173/',
    expected_date: null 
  },

  { 
    id: 8, 
    title: '부진재고 관리', 
    description: '장기 체류 재고 현황을 분석하고 최적의 처리 방안을 제안합니다.',
    category: 'management', 
    status: 'completed', 
    icon: 'package', 
    external_link: 'https://sec-api.lloydk.ai/signin',
    expected_date: null 
  },
];



// 페이지 매핑 정보 (참고용)
// const demoPageMap = {
//     '신입사원 온보딩 서비스': 'OnboardingService',
//     '문서 품질 및 오류 관리': 'DocumentQuality',
//     '보고서 자동 생성': 'ReportGenerator',
//     '부진재고 관리': 'SlowMovingInventory',
//     'VOC 자동 분류': 'VocService',
//     '사내 보안 규정 챗봇': 'SecurityChatbot',
//   };
