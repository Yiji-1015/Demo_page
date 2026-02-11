import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from 'lucide-react'; // Chevron 아이콘 제거
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
// API 클라이언트 import 경로 확인 필요 (이전 단계에서 수정한 client.js 사용 권장)
// import { sendChatMessage } from '../../api'; 
import { onboardingApi as client } from '@/api/client'; 
import MessageBubble from './MessageBubble'; 

// ==========================================
// 샘플 Q&A 데이터 (그대로 유지)
// ==========================================
const sampleQnA = {
  '연차': {
    answer: '**📅 연차 발생 및 사용 안내**\n\n**발생 기준**\n• 입사 첫해: 월 1개씩 발생 (최대 11개)\n• 1년 근속 이후: 연 15일 발생\n• 3년 이상: 2년마다 1일 추가 (최대 25일)\n\n**신청 방법**\n1️⃣ HR Portal 로그인 → 전자결재\n2️⃣ 휴가신청서 작성\n3️⃣ 팀장 승인 후 사용\n\n**💡 중요 사항**\n• 당해연도 내 사용 원칙 (미사용시 소멸)\n• 미사용분 금전 보상 가능 (부득이한 사유)',
    sources: [
      { title: '인사관리규정 - 연차휴가', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/123' },
      { title: '복리후생 가이드', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/456' },
      { title: 'HR Portal 사용 매뉴얼', url: 'https://lloydk.atlassian.net/wiki/spaces/IT/pages/789' },
      { title: '휴가 신청 절차', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/234' }
    ]
  },
  '재택근무': {
    answer: '**💻 재택근무 신청 가이드**\n\n**신청 자격**\n• 정규직 6개월 이상 근속\n• 재택 가능 직무 (팀장 확인 필요)\n\n**신청 절차**\n1️⃣ 전자결재 → 재택근무 신청서\n2️⃣ 팀장 승인 → 인사팀 최종 승인\n\n**운영 규칙**\n• 주 2회 이내 / 코어타임 10:00-16:00 준수\n• 온라인 상태 유지 필수\n• 화상회의 필수 참석\n\n**🔒 보안 준수사항**\n• 회사 노트북 + VPN 필수\n• 개인 PC 사용 금지',
    sources: [
      { title: '재택근무 운영 지침', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/789' },
      { title: '정보보안 정책', url: 'https://lloydk.atlassian.net/wiki/spaces/IT/pages/321' },
      { title: 'VPN 접속 가이드', url: 'https://lloydk.atlassian.net/wiki/spaces/IT/pages/654' },
      { title: '재택근무 FAQ', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/987' }
    ]
  },
  '경조사': {
    answer: '**🎉 경조사 휴가 및 경조금**\n\n**휴가 일수**\n• 본인 결혼: 5일\n• 배우자/부모 사망: 5일\n• 자녀 결혼: 1일\n• 조부모 사망: 2일\n\n**경조금 지급**\n• 본인 결혼: 20만원\n• 직계존속 사망: 10만원\n• 자녀 결혼: 10만원\n\n**신청 방법**\n1️⃣ 팀장 구두 보고\n2️⃣ HR Portal 경조사 휴가 신청\n3️⃣ 증빙서류 제출 (청첩장/부고장)',
    sources: [
      { title: '복리후생 규정 - 경조사', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/654' },
      { title: '경조사 신청 절차', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/111' },
      { title: '경조금 지급 규정', url: 'https://lloydk.atlassian.net/wiki/spaces/FIN/pages/222' }
    ]
  },
  '건강검진': {
    answer: '**🏥 건강검진 제도**\n\n**대상 및 주기**\n• 사무직: 2년마다 / 비사무직: 매년\n• 40세 이상: 종합검진 매년\n\n**지원 내역**\n• 기본 건강검진: 100% 회사 부담\n• 정밀검진: 50% 본인 부담\n• 배우자 검진: 70% 회사 지원\n\n**이용 방법**\n1️⃣ 인사팀 지정 병원 확인\n2️⃣ 본인이 직접 병원 예약\n3️⃣ 검진일 신분증 지참\n4️⃣ 결과지 인사팀 제출\n\n**✅ 검진 당일 유급휴가 1일 제공**',
    sources: [
      { title: '건강검진 안내', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/987' },
      { title: '지정 병원 리스트', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/333' },
      { title: '건강검진 예약 방법', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/444' }
    ]
  },
  '교육': {
    answer: '**📚 교육 및 자기계발 지원**\n\n**사내 교육**\n• 신입 입문교육: 2주\n• 직무 전문교육: 분기별\n• 리더십 교육: 관리자 대상\n• 어학 교육: 희망자 대상\n\n**외부 교육 지원**\n• 업무 관련 교육: 100% 지원\n• 자격증 취득: 응시료/교재비 지원\n• 온라인 강의: 연 50만원 한도\n\n**신청 절차**\n1️⃣ 교육 신청서 작성\n2️⃣ 팀장 → 인사팀 승인\n3️⃣ 수료 후 증빙서류 제출\n\n**💰 자격증 보유 수당: 월 5~20만원**',
    sources: [
      { title: '교육훈련 규정', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/741' },
      { title: '자격증 지원 안내', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/852' },
      { title: '교육 신청 방법', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/555' },
      { title: '온라인 교육 플랫폼 가이드', url: 'https://lloydk.atlassian.net/wiki/spaces/IT/pages/666' }
    ]
  },
  '급여': {
    answer: '**💰 급여 및 복리후생**\n\n**급여 지급일**\n• 매월 25일 (주말/공휴일시 전일 지급)\n• 계좌이체 방식\n\n**급여 명세서**\n• HR Portal에서 확인 가능\n• 매월 25일 자동 업로드\n\n**포함 항목**\n• 기본급 + 직책수당\n• 식대 (20만원)\n• 교통비 (10만원)\n• 자격증 수당 (해당자)\n\n**💳 복지카드: 월 10만원 자동 충전**',
    sources: [
      { title: '급여 지급 규정', url: 'https://lloydk.atlassian.net/wiki/spaces/FIN/pages/100' },
      { title: 'HR Portal 급여명세서 확인', url: 'https://lloydk.atlassian.net/wiki/spaces/IT/pages/200' },
      { title: '복지카드 사용 안내', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/300' }
    ]
  },
  '퇴사': {
    answer: '**👋 퇴사 절차 안내**\n\n**사직 신청**\n• 최소 30일 전 사직서 제출\n• 전자결재 시스템 이용\n\n**퇴사 처리 순서**\n1️⃣ 사직서 제출 및 승인\n2️⃣ 업무 인수인계 (2주)\n3️⃣ 회사 자산 반납 (노트북, 명함 등)\n4️⃣ 퇴직금 정산\n5️⃣ 최종 근무일 확정\n\n**퇴직금**\n• 1년 이상 근속시 지급\n• 최종 근무일 기준 14일 이내 지급\n\n**📄 경력증명서: 인사팀 요청**',
    sources: [
      { title: '퇴사 절차 안내', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/900' },
      { title: '인수인계 가이드', url: 'https://lloydk.atlassian.net/wiki/spaces/HR/pages/910' },
      { title: '퇴직금 정산 규정', url: 'https://lloydk.atlassian.net/wiki/spaces/FIN/pages/920' }
    ]
  }
};

const faqCategories = [
  {
    category: '근태 관리',
    icon: '📅',
    questions: ['연차는 어떻게 사용하나요?', '재택근무 신청 방법이 궁금해요', '경조사 휴가는 며칠인가요?']
  },
  {
    category: '복리후생',
    icon: '🎁',
    questions: ['건강검진은 언제 받나요?', '교육 지원은 어떻게 받나요?', '급여는 언제 지급되나요?']
  },
  {
    category: '기타',
    icon: '❓',
    questions: ['퇴사 절차가 궁금합니다', '복지카드는 어떻게 사용하나요?']
  }
];

// ==========================================
// 메인 컴포넌트
// ==========================================
export default function ChatArea({ messages, setMessages, embeddingInitialized, demoMode, currentSessionId, onCreateSession }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // 스크롤 자동 이동
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return; 

    if (!embeddingInitialized && !demoMode) {
      toast.warning('먼저 임베딩을 초기화하고 문서를 임베딩해주세요');
      return;
    }

    if (!currentSessionId) {
      onCreateSession();
    }

    // 화면에 보여줄 사용자 메시지
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const queryText = input.trim(); // 변수명 변경 (헷갈림 방지)
    setInput('');
    setIsLoading(true);

    // 1. 데모 모드일 때
    if (demoMode) {
      setTimeout(() => {
        let matchedAnswer = null;
        for (const [keyword, qna] of Object.entries(sampleQnA)) {
          if (query.includes(keyword)) {
            matchedAnswer = qna;
            break;
          }
        }

        if (!matchedAnswer) {
          matchedAnswer = {
            answer: '죄송합니다. 해당 질문에 대한 답변을 찾지 못했습니다.\n\n다음 주제로 질문해보시겠어요?\n- 연차 사용 방법\n- 재택근무 신청\n- 경조사 휴가\n- 건강검진 안내\n- 교육 및 자격증 지원',
            sources: []
          };
        }

        const aiMessage = {
          role: 'assistant',
          content: matchedAnswer.answer,
          sources: matchedAnswer.sources,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1500);
      return;
    }

    // 2. 실제 백엔드 호출
    try {
      // 🚀 [수정 1] 백엔드 ChatRequest 모델(main.py)에 맞춰 필드명 수정!
      // 백엔드는 'query'를 기다리고 있습니다. ('message' 아님)
      const payload = {
        query: queryText,          // ✅ message -> query 로 변경
        top_k: 3,
        score_threshold: 0.0
        // session_id는 현재 백엔드 ChatRequest에 없으므로 보내도 무시되거나 에러날 수 있어 일단 뺍니다.
      };

      const response = await client.post('/chat', payload);
      const resData = response.data;

      const aiMessage = {
        role: 'assistant',
        content: resData.answer,
        sources: resData.sources,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("채팅 에러:", error);
      
      // 🚀 [수정 2] 에러 메시지가 객체(Object)로 올 경우 문자열로 변환 (React 에러 방지)
      let errorMessage = '백엔드 서버 연결 실패';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI Validation Error (422) 처리
          errorMessage = detail.map(e => e.msg).join(', '); 
        } else if (typeof detail === 'object') {
          errorMessage = JSON.stringify(detail);
        }
      }
      
      toast.error(errorMessage);
      
      // 에러 났을 때도 챗봇 말풍선 띄우기
      setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `죄송합니다. 오류가 발생했습니다.\n(${errorMessage})`, 
          timestamp: new Date().toISOString() 
      }]);

    } finally {
      setIsLoading(false);
    }
    };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    // ✅ 수정 1: h-full w-full relative (전체 화면 채우기)
    <div className="flex flex-col h-full w-full bg-white relative">
      
      {/* ⚠️ 수정 2: 사이드바 토글 버튼(화살표) 삭제됨 */}

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        // ✅ 수정 3: 고정 height 삭제하고 flex-1 사용 (스크롤 문제 해결)
        className="flex-1 overflow-y-auto p-8"
      >
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto py-8">
            <div className="text-center mb-8">
              <div className="p-4 rounded-full bg-gray-100 w-16 h-16 mx-auto mb-5 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-[24px] font-semibold text-gray-900 tracking-tight mb-2">신입사원 온보딩 챗봇 👋</h3>
              <p className="text-[14px] text-gray-600">궁금한 점을 자유롭게 질문해주세요. Confluence 문서를 기반으로 정확하게 답변드립니다.</p>
            </div>

            {/* FAQ Categories */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-3">
                <h4 className="text-[15px] font-semibold text-gray-900">자주 묻는 질문</h4>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              
              {faqCategories.slice(0, 2).map((cat, idx) => (
                <div key={idx} className="bg-gray-50/50 rounded-xl border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] p-4 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.06)] transition-all">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-base">{cat.icon}</span>
                    <h5 className="font-semibold text-gray-900 text-[13px]">{cat.category}</h5>
                  </div>
                  <div className="grid gap-1.5">
                    {cat.questions.slice(0, 2).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(q)}
                        className="px-3 py-2 bg-white rounded-lg border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.06)] transition-all text-left text-[12px] text-gray-700 font-normal group"
                      >
                        <span className="group-hover:text-gray-900 transition-colors">{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100/80 rounded-2xl p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {/* ✅ 수정 4: flex-shrink-0 추가 (입력창 고정) */}
      <div className="border-t border-gray-200/50 bg-white px-8 py-5 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="연차, 재택근무, 경조사, 건강검진, 교육 등에 대해 물어보세요..."
              disabled={isLoading}
              className="min-h-[56px] max-h-[200px] resize-none bg-gray-50/50 border-gray-200/60 focus:bg-white focus:border-gray-300 focus:ring-0 text-[14px] rounded-xl"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-sm h-[56px]"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}