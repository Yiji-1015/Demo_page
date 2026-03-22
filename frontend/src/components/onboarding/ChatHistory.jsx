import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Trash2, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

export default function ChatHistory({ 
  chatSessions, 
  currentSessionId, 
  onCreateSession, 
  onLoadSession, 
  onDeleteSession 
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-200/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-[14px]">채팅 내역</h3>
          <Button
            onClick={onCreateSession}
            size="sm"
            className="h-8 bg-gray-900 hover:bg-gray-800 text-white text-[12px]"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            새 대화
          </Button>
        </div>
        <p className="text-[12px] text-gray-500">
          총 {chatSessions.length}개의 세션
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {chatSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-[13px] text-gray-500 mb-3">아직 채팅 세션이 없습니다</p>
              <Button
                onClick={onCreateSession}
                size="sm"
                className="bg-gray-900 hover:bg-gray-800 text-white text-[12px]"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                첫 대화 시작하기
              </Button>
            </div>
          ) : (
            chatSessions.map((session) => (
              <div
                key={session.id}
                className={`group p-3 rounded-lg transition-all cursor-pointer ${
                  currentSessionId === session.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50/50 hover:bg-gray-100/80 text-gray-900'
                }`}
                onClick={() => onLoadSession(session.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${
                        currentSessionId === session.id ? 'text-white' : 'text-gray-500'
                      }`} />
                      <p className={`text-[13px] font-medium truncate ${
                        currentSessionId === session.id ? 'text-white' : 'text-gray-900'
                      }`}>
                        {session.title}
                      </p>
                    </div>
                    <p className={`text-[11px] ${
                      currentSessionId === session.id ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {format(new Date(session.createdAt), 'yyyy.MM.dd HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${
                      currentSessionId === session.id 
                        ? 'hover:bg-gray-800 text-white' 
                        : 'hover:bg-red-50 text-red-600'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {session.messages.length > 0 && (
                  <p className={`text-[11px] mt-2 line-clamp-1 ${
                    currentSessionId === session.id ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {session.messages[session.messages.length - 1]?.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}