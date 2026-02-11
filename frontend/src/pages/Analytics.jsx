import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertCircle, 
  Zap,
  Brain,
  Target,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import MetricCard from '../components/analytics/MetricCard';
import TrendChart from '../components/analytics/TrendChart';
import InsightCard from '../components/analytics/InsightCard';

// Cross-service aggregated data
const serviceUsageData = [
  { week: '1주', qna: 680, docQuality: 520, reports: 340, inventory: 280 },
  { week: '2주', qna: 720, docQuality: 580, reports: 380, inventory: 310 },
  { week: '3주', qna: 850, docQuality: 640, reports: 420, inventory: 350 },
  { week: '4주', qna: 910, docQuality: 690, reports: 480, inventory: 380 },
];

const performanceScore = [
  { service: 'Q&A 서비스', score: 94.5, target: 90 },
  { service: '문서 품질', score: 98.2, target: 95 },
  { service: '보고서 생성', score: 91.3, target: 90 },
  { service: '재고 관리', score: 88.7, target: 85 },
];

const predictiveData = [
  { month: '7월', actual: null, predicted: 3200, confidence: 87 },
  { month: '8월', actual: null, predicted: 3450, confidence: 82 },
  { month: '9월', actual: null, predicted: 3700, confidence: 78 },
  { month: '10월', actual: null, predicted: 3850, confidence: 75 },
];

const anomalies = [
  { 
    service: 'Q&A 서비스', 
    type: 'warning', 
    message: '저녁 시간대 질문 급증 (평소 대비 +245%)', 
    impact: 'medium',
    suggestion: '추가 AI 용량 할당 권장'
  },
  { 
    service: '문서 품질', 
    type: 'info', 
    message: '특정 부서의 오류율 감소 (-35%)', 
    impact: 'low',
    suggestion: '우수 사례로 공유 추천'
  },
  { 
    service: '재고 관리', 
    type: 'critical', 
    message: '부진재고 증가 추세 감지 (+18%)', 
    impact: 'high',
    suggestion: '즉시 프로모션 전략 실행 필요'
  },
];

const crossServiceInsights = [
  {
    title: '서비스 간 연관성 발견',
    description: 'Q&A 서비스 사용량과 문서 품질 개선이 높은 상관관계 (0.87)',
    recommendation: 'Q&A 인사이트를 문서 가이드라인에 반영',
    impact: 'high',
    category: 'correlation'
  },
  {
    title: '업무 효율성 향상',
    description: '보고서 자동 생성 사용자의 평균 업무 시간 32% 단축',
    recommendation: '타 부서로 확대 적용 권장',
    impact: 'high',
    category: 'efficiency'
  },
  {
    title: '예측 정확도 향상',
    description: 'AI 모델 학습 데이터 증가로 예측 정확도 +12% 개선',
    recommendation: '예측 기능을 더 많은 서비스에 적용',
    impact: 'medium',
    category: 'improvement'
  },
];

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [visibleWidgets, setVisibleWidgets] = useState({
    metrics: true,
    usage: true,
    performance: true,
    predictions: true,
    anomalies: true,
    insights: true
  });

  const toggleWidget = (widget) => {
    setVisibleWidgets(prev => ({ ...prev, [widget]: !prev[widget] }));
  };

  const totalUsage = serviceUsageData[serviceUsageData.length - 1];
  const totalRequests = totalUsage.qna + totalUsage.docQuality + totalUsage.reports + totalUsage.inventory;
  const avgScore = (performanceScore.reduce((sum, s) => sum + s.score, 0) / performanceScore.length).toFixed(1);

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-5 mb-4">
            <div className="p-3 rounded-xl bg-gray-100">
              <Brain className="w-7 h-7 text-gray-700" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight">AI 통합 분석 대시보드</h1>
              <p className="text-[14px] text-gray-600 mt-0.5">전체 서비스 메트릭 및 AI 기반 인사이트</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <TabsList className="bg-gray-100/80 border-0 p-1 rounded-lg">
                <TabsTrigger value="daily" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] rounded-md">일간</TabsTrigger>
                <TabsTrigger value="weekly" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] rounded-md">주간</TabsTrigger>
                <TabsTrigger value="monthly" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-[13px] rounded-md">월간</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toggleWidget('metrics')} className="border-gray-200 text-gray-700 hover:bg-gray-100 text-[13px] h-9 rounded-lg">
                {visibleWidgets.metrics ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="sm" className="border-gray-200 text-gray-700 hover:bg-gray-100 text-[13px] h-9 rounded-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                위젯 커스터마이즈
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        {visibleWidgets.metrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            <MetricCard
              title="총 요청 수"
              value={totalRequests.toLocaleString()}
              change={+18.5}
              icon={Activity}
              color="blue"
            />
            <MetricCard
              title="평균 성능 점수"
              value={`${avgScore}%`}
              change={+5.2}
              icon={Target}
              color="emerald"
            />
            <MetricCard
              title="활성 사용자"
              value="1,247"
              change={+12.3}
              icon={Users}
              color="purple"
            />
            <MetricCard
              title="평균 응답 시간"
              value="1.2초"
              change={-8.5}
              icon={Clock}
              color="amber"
              reverseColor={true}
            />
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Service Usage Trends */}
          {visibleWidgets.usage && (
            <Card className="lg:col-span-2">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  서비스별 사용 추이
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={serviceUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="qna" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Q&A" />
                    <Area type="monotone" dataKey="docQuality" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="문서품질" />
                    <Area type="monotone" dataKey="reports" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="보고서" />
                    <Area type="monotone" dataKey="inventory" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="재고" />
                  </AreaChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{totalUsage.qna}</div>
                    <div className="text-xs text-blue-600 mt-1">Q&A 서비스</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-600">{totalUsage.docQuality}</div>
                    <div className="text-xs text-emerald-600 mt-1">문서 품질</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">{totalUsage.reports}</div>
                    <div className="text-xs text-purple-600 mt-1">보고서</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="text-2xl font-bold text-amber-600">{totalUsage.inventory}</div>
                    <div className="text-xs text-amber-600 mt-1">재고 관리</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Radar */}
          {visibleWidgets.performance && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  성능 스코어
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={performanceScore}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="service" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="실제" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    <Radar name="목표" dataKey="target" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.3} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>

                <div className="space-y-2 mt-4">
                  {performanceScore.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.service.split(' ')[0]}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{item.score}%</span>
                        {item.score >= item.target ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Predictions & Anomalies */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Predictive Analytics */}
          {visibleWidgets.predictions && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  AI 예측 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4 p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
                  <h4 className="font-semibold text-indigo-800 mb-2">다음 달 예측</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-indigo-600">예상 총 요청</div>
                      <div className="text-2xl font-bold text-indigo-700">3,200</div>
                    </div>
                    <div>
                      <div className="text-sm text-indigo-600">신뢰도</div>
                      <div className="text-2xl font-bold text-indigo-700">87%</div>
                    </div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={predictiveData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="예측치"
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold text-slate-800 text-sm">예측 기반 권장사항</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2 p-2 rounded bg-blue-50">
                      <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-blue-700">Q&A 서비스 용량 20% 증설 권장</span>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded bg-emerald-50">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-emerald-700">현재 인프라로 문서 품질 처리 가능</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Anomaly Detection */}
          {visibleWidgets.anomalies && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  이상 징후 감지
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {anomalies.map((anomaly, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-lg border ${
                        anomaly.type === 'critical'
                          ? 'bg-red-50 border-red-200'
                          : anomaly.type === 'warning'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          anomaly.type === 'critical'
                            ? 'text-red-600'
                            : anomaly.type === 'warning'
                            ? 'text-amber-600'
                            : 'text-blue-600'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-800 text-sm">{anomaly.service}</span>
                            <Badge 
                              variant="outline"
                              className={`text-xs ${
                                anomaly.impact === 'high'
                                  ? 'bg-red-100 text-red-700 border-red-200'
                                  : anomaly.impact === 'medium'
                                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                                  : 'bg-blue-100 text-blue-700 border-blue-200'
                              }`}
                            >
                              {anomaly.impact === 'high' ? '높음' : anomaly.impact === 'medium' ? '중간' : '낮음'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{anomaly.message}</p>
                          <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                            💡 {anomaly.suggestion}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-4">
                  모든 알림 보기
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cross-Service AI Insights */}
        {visibleWidgets.insights && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-600" />
                AI 크로스 서비스 인사이트
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-4">
                {crossServiceInsights.map((insight, idx) => (
                  <InsightCard key={idx} insight={insight} index={idx} />
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  전략적 권장사항
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start text-left">
                    <Target className="w-4 h-4 mr-2" />
                    통합 KPI 대시보드 생성
                  </Button>
                  <Button variant="outline" className="justify-start text-left">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    서비스 최적화 플랜 수립
                  </Button>
                  <Button variant="outline" className="justify-start text-left">
                    <Users className="w-4 h-4 mr-2" />
                    사용자 행동 분석 리포트
                  </Button>
                  <Button variant="outline" className="justify-start text-left">
                    <Zap className="w-4 h-4 mr-2" />
                    AI 모델 성능 개선
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}