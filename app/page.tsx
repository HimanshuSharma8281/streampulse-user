'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Tv,
  Users,
  MessageSquare,
  Zap,
  Play,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '@/components/ui/Navbar';
import { LiveBadge } from '@/components/stream/LiveBadge';
import { ViewerCount } from '@/components/stream/ViewerCount';
import { getSocket } from '@/lib/socket/socketClient';

interface StreamState {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'offline' | 'live' | 'starting';
  current_viewers: number;
  peak_viewers: number;
}

export default function HomePage() {
  const [stream, setStream] = useState<StreamState>({
    id: 'main-stream',
    title: 'Football Live — English Commentary & Match Analysis',
    description: 'Broadcasting live high-definition screen and commentary. Join the real-time chat and enjoy the stream!',
    category: 'Sports & Live Action',
    status: 'offline',
    current_viewers: 0,
    peak_viewers: 0,
  });

  useEffect(() => {
    const socket = getSocket();

    socket.on('stream:status-changed', (data: any) => {
      setStream((prev) => ({
        ...prev,
        status: data.status,
        title: data.title || prev.title,
        description: data.description || prev.description,
      }));
    });

    socket.on('stream:viewer-count', (data: { current: number; peak: number }) => {
      setStream((prev) => ({
        ...prev,
        current_viewers: data.current,
        peak_viewers: data.peak,
      }));
    });

    return () => {
      socket.off('stream:status-changed');
      socket.off('stream:viewer-count');
    };
  }, []);

  const isLive = stream.status === 'live';

  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col selection:bg-rose-500">
      <Navbar isLive={isLive} viewerCount={stream.current_viewers} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {/* HERO */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#161924]/80 via-[#10121b]/80 to-[#0c0d14]/80 border border-white/10 p-8 sm:p-12 lg:p-16 shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wide">
              {isLive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-rose-400 font-bold">LIVE BROADCAST IN PROGRESS</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300">Ultra-Low Latency Live Streaming</span>
                </>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Watch Live & Connect in <span className="bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 bg-clip-text text-transparent">Real Time.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Experience zero-latency live screen broadcasting, high-fidelity audio, dynamic viewer presence, and interactive community chat.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/live"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm sm:text-base tracking-wide shadow-xl shadow-rose-600/30 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>WATCH LIVE</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
        </section>

        {/* LIVE NOW / STREAM SHOWCASE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isLive ? '🔴 LIVE NOW' : 'Featured Broadcast'}
              </h2>
            </div>
            <Link
              href="/live"
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              <span>Go to Stream</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-rose-500/40 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2.5">
                  <LiveBadge status={stream.status} size="sm" />
                  <ViewerCount count={stream.current_viewers} isLive={isLive} size="sm" />
                  <span className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                    {stream.category}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-rose-400 transition-colors">
                  {stream.title}
                </h3>

                <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                  {stream.description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/live"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isLive ? 'Join Stream' : 'View Stream Page'}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Engineered for Real-Time Performance
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Sub-second latency, dynamic presence, and instant interactive chat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Ultra-Low Latency</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sub-second WebRTC video & crystal-clear audio with zero buffering lag.
              </p>
            </div>

            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Live Presence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dynamic live viewer counter with real-time heartbeat synchronization.
              </p>
            </div>

            <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Live Community Chat</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant websocket chat with emojis, handles, and responsive desktop/mobile layouts.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0c0e14] py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-semibold text-white">StreamPulse Live</span>
          </div>
          <p className="text-slate-500 text-[11px]">
            Real-time live streaming platform. Viewers can watch and chat in real time.
          </p>
        </div>
      </footer>
    </div>
  );
}
