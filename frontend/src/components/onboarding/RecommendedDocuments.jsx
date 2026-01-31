import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  ExternalLink, 
  Star,
  TrendingUp,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function RecommendedDocuments({ user }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  // 사용자의 즐겨찾기/조회 기록 가져오기
  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => base44.entities.FavoriteDocument.list('-view_count'),
  });

  // AI 기반 추천 생성
  const generateRecommendations = async () => {
    setLoading(true);
    try {
      // 사용자 행동 분석 데이터 준비
      const viewedDocs = favorites.slice(0, 10).map(f => ({
        title: f.page_title,
        category: f.category,
        keywords: f.keywords,
        view_count: f.view_count
      }));

      const prompt = `당신은 회사 내부 문서 추천 시스템입니다. 다음 정보를 바탕으로 사용자에게 도움이 될 문서를 추천해주세요.

**사용자 정보:**
- 이메일: ${user?.email || '신입사원'}
- 역할: ${user?.role || 'user'}

**최근 조회한 문서들:**
${viewedDocs.length > 0 ? viewedDocs.map(d => `- ${d.title} (카테고리: ${d.category || '미분류'}, 조회수: ${d.view_count || 0}회)`).join('\n') : '아직 조회 기록이 없습니다'}

**추천 규칙:**
1. 사용자가 자주 보는 카테고리와 관련된 문서 추천
2. 신입사원이라면 온보딩, 복리후생, 기본 규정 문서 우선
3. 조회수가 낮은 중요 문서도 포함
4. 최신 업데이트된 문서 우선

다음 Confluence 문서 카테고리에서 5개의 문서를 추천해주세요:
- 인사관리 (연차, 경조사, 급여 등)
- 복리후생 (건강검진, 교육, 복지카드 등)
- 업무 가이드 (재택근무, 보안 정책, 협업 도구 등)
- 회사 소개 (비전, 조직도, 연혁 등)

각 추천 문서에 대해 추천 이유도 간단히 설명해주세요.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  reason: { type: "string" },
                  relevance_score: { type: "number" }
                },
                required: ["title", "category", "reason"]
              },
              minItems: 5,
              maxItems: 5
            }
          },
          required: ["recommendations"]
        }
      });

      setRecommendations(result.recommendations);
      toast.success('AI가 맞춤 문서를 추천했습니다');
    } catch (error) {
      toast.error('추천 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 자동 추천
  useEffect(() => {
    if (user && favorites.length >= 0) {
      generateRecommendations();
    }
  }, [user]);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-slate-800">AI 추천 문서</h3>
        </div>
        <Button
          onClick={generateRecommendations}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-2" />
              새로고침
            </>
          )}
        </Button>
      </div>

      {/* 설명 */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
        <p className="text-xs text-slate-600">
          <Sparkles className="w-3 h-3 inline mr-1 text-purple-600" />
          당신의 업무 패턴과 관심사를 분석하여 유용한 문서를 추천합니다
        </p>
      </div>

      {/* 추천 문서 목록 */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
          AI가 문서를 분석하는 중...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">아직 추천 문서가 없습니다</p>
          <Button
            onClick={generateRecommendations}
            size="sm"
            className="mt-3"
          >
            추천 받기
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-all hover:border-purple-300"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-slate-800">
                      {rec.title}
                    </h4>
                    {rec.relevance_score && rec.relevance_score > 80 && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                        <Star className="w-2 h-2 mr-1" />
                        강력 추천
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs mb-2">
                    {rec.category}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                💡 {rec.reason}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-3 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  문서 보기
                </Button>
                {rec.relevance_score && (
                  <span className="ml-auto text-xs text-slate-500">
                    관련도: {rec.relevance_score}%
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 피드백 섹션 */}
      {recommendations.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-600 text-center">
            추천이 도움이 되셨나요? 문서를 자주 보면 더 정확한 추천을 받을 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}