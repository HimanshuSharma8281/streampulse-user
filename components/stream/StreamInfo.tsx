'use client';

import React, { useState } from 'react';
import { Share2, Check, Tag, Info, User, Radio } from 'lucide-react';
import { StreamInfo as StreamInfoType } from '@/lib/types';
import { LiveBadge } from './LiveBadge';
import { ViewerCount } from './ViewerCount';

interface StreamInfoProps {
  stream: StreamInfoType;
}

export const StreamInfo: React.FC<StreamInfoProps> = ({ stream }) => {
  const [copied, setCopied] = useState(false);
  const [showDesc, setShowDesc] = useState(true);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin + '/live');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Streamer Avatar & Title */}
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 p-0.5 shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-[#0d0f17] rounded-[14px] flex items-center justify-center">
                <Radio className="w-7 h-7 text-rose-400" />
              </div>
            </div>
            {stream.status === 'live' && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#12141c] rounded-full" />
            )}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <LiveBadge status={stream.status} size="sm" />
              <ViewerCount count={stream.current_viewers} isLive={stream.status === 'live'} size="sm" />
              {stream.category && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                  <Tag className="w-3 h-3" />
                  {stream.category}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {stream.title}
            </h1>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-rose-400" />
                {stream.streamer_name || 'Broadcaster'}
              </span>
              <span>•</span>
              <span>Started {stream.started_at ? new Date(stream.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-slate-300" />}
            <span>{copied ? 'Link Copied' : 'Share Stream'}</span>
          </button>
        </div>
      </div>

      {/* Description */}
      {stream.description && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" /> About this stream
            </span>
            <button
              onClick={() => setShowDesc(!showDesc)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              {showDesc ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {showDesc && (
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-black/20 p-3 rounded-xl border border-white/5">
              {stream.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
