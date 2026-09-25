'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/userContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const QUICK_EMOJIS = ['🔥', '⚽', '👏', '🏆', '😂', '🚀', '❤️', '⚡', '🍿', '💯'];

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const { user, setUsername } = useAuth();
  const [text, setText] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(user.username);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(user.username);
  }, [user.username]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    if (trimmed.length > 300) {
      setRateLimitWarning('Message too long (max 300 characters)');
      return;
    }

    onSendMessage(trimmed);
    setText('');
    setRateLimitWarning(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji: string) => {
    setText((prev) => (prev + emoji).slice(0, 300));
    inputRef.current?.focus();
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUsername(tempName.trim());
      setEditingName(false);
    }
  };

  return (
    <div className="p-3 bg-[#10121a] border-t border-white/10">
      {rateLimitWarning && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{rateLimitWarning}</span>
        </div>
      )}

      {/* Quick emoji row */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => addEmoji(emoji)}
            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-sm transition-all hover:scale-110 active:scale-95 flex-shrink-0"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Username prompt */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
        {editingName ? (
          <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              maxLength={20}
              autoFocus
              className="bg-slate-900 border border-white/20 rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:border-rose-500"
            />
            <button
              type="submit"
              className="text-rose-400 hover:text-rose-300 font-semibold text-xs px-1.5 py-0.5"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditingName(false)}
              className="text-slate-400 hover:text-slate-300 text-xs"
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-1">
            <span>Chatting as</span>
            <span className="font-semibold text-slate-200">{user.username}</span>
            <button
              onClick={() => setEditingName(true)}
              className="text-slate-400 hover:text-white underline ml-1 cursor-pointer"
            >
              (Edit)
            </button>
          </div>
        )}

        <span className={`text-[10px] font-mono ${text.length > 280 ? 'text-amber-400' : 'text-slate-400'}`}>
          {text.length}/300
        </span>
      </div>

      {/* Input box */}
      <div className="relative flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={300}
          disabled={disabled}
          placeholder={disabled ? 'Chat is temporarily disabled...' : 'Send a message in chat...'}
          className="w-full bg-[#181b26] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/60 transition-all"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="flex-shrink-0 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-rose-600/20 active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
