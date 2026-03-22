import React from 'react';
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const categoryIcons = {
  correlation: TrendingUp,
  efficiency: Zap,
  improvement: Target,
};

const categoryColors = {
  correlation: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
  efficiency: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600' },
  improvement: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' },
};

export default function InsightCard({ insight, index }) {
  const Icon = categoryIcons[insight.category] || TrendingUp;
  const colors = categoryColors[insight.category] || categoryColors.correlation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`p-4 rounded-lg border ${colors.bg} ${colors.border} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg bg-white border ${colors.border}`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold text-sm mb-1 ${colors.text}`}>{insight.title}</h4>
          <Badge 
            variant="outline" 
            className={`text-xs ${colors.text} ${colors.bg} ${colors.border}`}
          >
            영향도: {insight.impact === 'high' ? '높음' : '중간'}
          </Badge>
        </div>
      </div>
      <p className="text-sm text-slate-700 mb-3">{insight.description}</p>
      <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
        💡 {insight.recommendation}
      </div>
    </motion.div>
  );
}