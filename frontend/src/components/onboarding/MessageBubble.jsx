import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function MessageBubble({ message }) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const isUser = message.role === 'user';

  const formatTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'hh:mm:ss a');
    } catch {
      return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-5 py-3 ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-white text-slate-800 shadow-sm border border-slate-200'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium w-full"
              >
                <FileText className="w-4 h-4" />
                <span>참고한 문서 ({message.sources.length}개)</span>
                {sourcesExpanded ? (
                  <ChevronUp className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                )}
              </button>

              {sourcesExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  {message.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-slate-800 text-sm">{source.title}</h5>
                        {source.score !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            유사도: {source.score.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          문서 보기
                        </a>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {message.timestamp && (
          <span className="text-xs text-slate-500 mt-1 px-2">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </motion.div>
  );
}