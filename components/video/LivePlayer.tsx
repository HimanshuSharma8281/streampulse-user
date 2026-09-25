'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  Tv,
  Wifi,
} from 'lucide-react';
import { WebRTCViewer } from '@/lib/streaming/WebRTCViewer';
import { LiveBadge } from '../stream/LiveBadge';
import { ViewerCount } from '../stream/ViewerCount';

interface LivePlayerProps {
  streamId?: string;
  isLive: boolean;
  viewerCount: number;
}

export const LivePlayer: React.FC<LivePlayerProps> = ({
  streamId = 'main-stream',
  isLive,
  viewerCount,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<WebRTCViewer | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('idle');
  const [showControls, setShowControls] = useState(true);
  const [hasAudioPermissionIssue, setHasAudioPermissionIssue] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLive) {
      if (viewerRef.current) {
        viewerRef.current.disconnect();
        viewerRef.current = null;
      }
      setConnectionState('offline');
      return;
    }

    setConnectionState('connecting');

    const viewer = new WebRTCViewer(
      (mediaStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current
            .play()
            .then(() => {
              setConnectionState('connected');
              setHasAudioPermissionIssue(false);
            })
            .catch((err) => {
              console.warn('[LivePlayer] Autoplay blocked, playing muted:', err);
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current.play();
                setHasAudioPermissionIssue(true);
              }
            });
        }
      },
      (state) => {
        setConnectionState(state);
      }
    );

    viewer.connect(streamId);
    viewerRef.current = viewer;

    return () => {
      viewer.disconnect();
    };
  }, [isLive, streamId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (hasAudioPermissionIssue) setHasAudioPermissionIssue(false);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isLive && isPlaying) setShowControls(false);
    }, 3500);
  };

  const handleManualReconnect = () => {
    if (viewerRef.current) {
      viewerRef.current.disconnect();
      setConnectionState('connecting');
      viewerRef.current.connect(streamId);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full aspect-video bg-[#000000] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group flex items-center justify-center select-none"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-contain ${!isLive ? 'hidden' : 'block'}`}
      />

      {/* Unmute prompt if browser blocked autoplay */}
      {hasAudioPermissionIssue && (
        <button
          onClick={toggleMute}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 px-4 py-2 bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2 animate-bounce"
        >
          <VolumeX className="w-4 h-4" />
          <span>Click to enable audio</span>
        </button>
      )}

      {/* STATE: OFFLINE */}
      {!isLive && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e1018] via-[#08090d] to-[#040406] flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-slate-900/80 border border-white/10 flex items-center justify-center shadow-2xl">
              <Tv className="w-9 h-9 text-slate-500" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="relative inline-flex rounded-full h-4 w-4 bg-slate-700 border-2 border-[#0e1018]"></span>
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            STREAM OFFLINE
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
            There is currently no live stream
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            The broadcaster hasn&apos;t started streaming yet or the session has ended. Stay tuned and check back shortly!
          </p>

          <button
            onClick={handleManualReconnect}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95 shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Stream</span>
          </button>
        </div>
      )}

      {/* STATE: CONNECTING */}
      {isLive && connectionState === 'connecting' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-center p-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center mb-3">
            <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-white">Connecting to live stream...</p>
        </div>
      )}

      {/* Top Overlay */}
      {isLive && (
        <div
          className={`absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none transition-opacity duration-300 z-20 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 pointer-events-auto">
            <LiveBadge status="live" size="md" />
            <ViewerCount count={viewerCount} isLive={true} size="md" />
          </div>

          <div className="pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>1080p Ultra HD</span>
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      {isLive && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 z-20 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>LIVE</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg text-white hover:bg-white/20 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
