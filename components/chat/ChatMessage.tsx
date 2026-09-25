'use client';

import React from 'react';
import { Crown, Shield } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isDeleted = message.is_deleted;

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2 rounded-xl transition-colors hover:bg-white/[0.04] ${
      isDeleted ? 'opacity-50' : ''
    }`}>
      {/* Role Avatar */}
      <div className="mt-0.5 flex-shrink-0">
        {message.role === 'admin' ? (
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-sm" title="Broadcaster">
            <Crown className="w-3.5 h-3.5" />
          </div>
        ) : message.role === 'moderator' ? (
          <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white" title="Moderator">
            <Shield className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 text-[10px] font-bold">
            {message.username.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
          <span
            className={`text-xs font-semibold truncate ${
              message.role === 'admin'
                ? 'text-rose-400 font-bold'
                : message.role === 'moderator'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-300'
            }`}
          >
            {message.username}
          </span>

          {message.role === 'admin' && (
            <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Host
            </span>
          )}

          <span className="text-[10px] text-slate-500 font-mono">{time}</span>
        </div>

        <p className={`text-xs sm:text-sm break-words leading-relaxed ${
          isDeleted ? 'text-slate-500 italic' : 'text-slate-100'
        }`}>
          {message.message}
        </p>
      </div>
    </div>
  );
};
