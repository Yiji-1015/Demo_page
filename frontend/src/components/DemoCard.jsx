import React, { forwardRef } from 'react';
import { CATEGORY_INFO, getIconComponent } from '@/lib/demoData';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  BarChart3, 
  Shield, 
  Link2, 
  Zap, 
  ArrowRight,
  Clock,
  CheckCircle2,
  ExternalLink 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

// 페이지 매핑 정보
const demoPageMap = {
  '신입사원 온보딩 서비스': 'OnboardingService',
  '인천공항 협업 포털/대전환 사규 사칙 챗봇': 'Incheon',
  '회의록 자동화(STT 및 영어 번역)': 'STT',
  '언론보도용 기사 초안 작성': 'NewsGenerator',
  '인사이트 파인더': 'Analytics',
  '민원 분류 서비스': 'complaints',
  '이상행동탐지': 'FDS',
  '삼성전자 n8n 부진 재고 데모': 'SlowMovingInventory'
};


// 🌟 수정 포인트 1: forwardRef로 함수 감싸기
const DemoCard = forwardRef(({ demo, index }, ref) => {
  if (!demo) return null;

  const isCompleted = demo.status === 'completed';
  const categoryData = CATEGORY_INFO[demo.category];
  const categoryLabel = categoryData ? categoryData.label : demo.category;
  
  const IconComponent = getIconComponent(demo.icon);
  const demoPage = demoPageMap[demo.title];

  // 핵심 로직: 링크 결정하기
  let CardWrapper = 'div';
  let cardProps = {};

  if (isCompleted) {
    if (demo.external_link) {
      CardWrapper = 'a';
      cardProps = { 
        href: demo.external_link, 
        target: '_blank', 
        rel: 'noopener noreferrer' 
      };
    } 
    else if (demoPage) {
      CardWrapper = Link;
      cardProps = { to: createPageUrl(demoPage) };
    }
  }

  const getFormattedDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isValid(date)) {
      return format(date, 'yyyy.MM.dd', { locale: ko });
    }
    return null;
  };

  const formattedDate = getFormattedDate(demo.expected_date);

  return (
    <motion.div
      // 🌟 수정 포인트 2: ref 연결하기 (여기가 핵심!)
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <CardWrapper {...cardProps} className="block h-full">
        <Card 
          className={`
            group relative overflow-hidden transition-all duration-300 h-full flex flex-col rounded-2xl
            ${isCompleted 
              ? 'bg-white border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)] cursor-pointer' 
              : 'bg-gray-50/50 border-0 shadow-[0_0_0_1px_rgba(0,0,0,0.03)] cursor-default'
            }
          `}
        >
          <div className="relative p-7 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className={`
                p-3 rounded-xl transition-all duration-300
                ${isCompleted 
                  ? 'bg-gray-100 group-hover:bg-gray-900 group-hover:scale-105' 
                  : 'bg-gray-100/50'
                }
              `}>
                <IconComponent className={`
                  w-5 h-5 transition-colors duration-300
                  ${isCompleted ? 'text-gray-700 group-hover:text-white' : 'text-gray-400'}
                `} />
              </div>
              
              {demo.category && (
                <Badge 
                  variant="outline" 
                  className={`
                    text-[11px] font-medium border-0 rounded-full px-2.5 py-0.5
                    ${isCompleted 
                      ? (categoryData?.color || 'bg-gray-100 text-gray-700')
                      : (categoryData?.color.replace('text-', 'text-opacity-60 text-') || 'bg-gray-100 text-gray-400')
                    }
                  `}
                >
                  {categoryLabel}
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className={`
              text-[17px] mb-2.5 transition-colors duration-300 font-semibold tracking-tight
              ${isCompleted ? 'text-gray-900' : 'text-gray-400'}
            `}>
              {demo.title}
            </h3>

            {/* Description */}
            <p className={`
              text-[14px] leading-relaxed mb-5 flex-grow
              ${isCompleted ? 'text-gray-600' : 'text-gray-400'}
            `}>
              {demo.description}
            </p>

            {/* Status */}
            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
              {isCompleted ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-[13px] font-medium text-green-600">시연 가능</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-900 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-[13px] font-medium">
                      {demo.external_link ? '이동하기' : '시작하기'}
                    </span>
                    {demo.external_link ? (
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    ) : (
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-[13px] text-gray-400">
                    {formattedDate ? `${formattedDate} 오픈 예정` : '준비 중'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </CardWrapper>
    </motion.div>
  );
});

// 🌟 수정 포인트 3: displayName 설정 (디버깅용)
DemoCard.displayName = "DemoCard";

export default DemoCard;