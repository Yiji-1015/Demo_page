import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

const colorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', icon: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: 'text-emerald-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', icon: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: 'text-amber-600' },
};

export default function MetricCard({ title, value, change, icon: Icon, color = 'blue', reverseColor = false }) {
  const colors = colorMap[color];
  const isPositive = reverseColor ? change < 0 : change > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              isPositive ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(change)}%
            </div>
          </div>
          <div className="text-sm text-slate-600 mb-1">{title}</div>
          <div className={`text-3xl font-bold ${colors.text}`}>{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}