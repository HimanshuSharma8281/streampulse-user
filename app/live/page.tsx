'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { LivePlayer } from '@/components/video/LivePlayer';
import { LiveChat } from '@/components/chat/LiveChat';
import { StreamInfo } from '@/components/stream/StreamInfo';
import { PaywallModal } from '@/components/payment/PaywallModal';
import { StreamInfo as StreamInfoType, ChatMessage } from '@/lib/types';
import { getSocket } from '@/lib/socket/socketClient';
import { useAuth } from '@/lib/auth/userContext';

export default function PublicLiveStreamPage() {
  const { user } = useAuth();
  const [stream, setStream] = useState<StreamInfoType>({
    id: 'main-stream',
    title: 'Football Live — English Commentary & Match Analysis',
    description: 'Broadcasting live high-definition screen and commentary. Join the real-time chat and enjoy the stream!',
    category: 'Sports & Live Action',
    status: 'offline',
    started_at: null,
    ended_at: null,
    current_viewers: 0,
    peak_viewers: 0,
    streamer_name: 'Official Streamer',
  });

  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(true); // Can be set to false if paywall is enabled
  const [showPaywall, setShowPaywall] = useState(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const joinStream = () => {
      socket.emit('viewer:join', {
        streamId: 'main-stream',
        viewerId: user.id,
        username: user.username,
      });
    };

    if (socket.connected) {
      joinStream();
    } else {
      socket.once('connect', joinStream);
    }

    // Heartbeat every 10 seconds
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit('viewer:heartbeat', {
          streamId: 'main-stream',
          viewerId: user.id,
        });
      }
    }, 10000);

    socket.on('stream:init', (data: { stream: StreamInfoType; messages: ChatMessage[] }) => {
      if (data.stream) setStream((prev) => ({ ...prev, ...data.stream }));
      if (data.messages) setInitialMessages(data.messages);
    });

    socket.on('stream:status-changed', (data: any) => {
      setStream((prev) => ({
        ...prev,
        status: data.status,
        started_at: data.started_at !== undefined ? data.started_at : prev.started_at,
        ended_at: data.ended_at !== undefined ? data.ended_at : prev.ended_at,
        title: data.title || prev.title,
        description: data.description || prev.description,
      }));
    });

    socket.on('stream:info-updated', (data: any) => {
      setStream((prev) => ({
        ...prev,
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

    const handleBeforeUnload = () => {
      socket.emit('viewer:leave', {
        streamId: 'main-stream',
        viewerId: user.id,
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      socket.emit('viewer:leave', {
        streamId: 'main-stream',
        viewerId: user.id,
      });
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.off('stream:init');
      socket.off('stream:status-changed');
      socket.off('stream:info-updated');
      socket.off('stream:viewer-count');
    };
  }, [user.id, user.username]);

  const isLive = stream.status === 'live';

  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col selection:bg-rose-500">
      <Navbar isLive={isLive} viewerCount={stream.current_viewers} />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
          
          {/* Video Player + Stream Details (Left on Desktop) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            <LivePlayer
              streamId={stream.id}
              isLive={isLive}
              viewerCount={stream.current_viewers}
            />

            <StreamInfo stream={stream} />
          </div>

          {/* Live Chat (Right on Desktop) */}
          <div className="lg:col-span-4 xl:col-span-3 h-[520px] lg:h-[calc(100vh-120px)] sticky top-20">
            <LiveChat streamId={stream.id} initialMessages={initialMessages} />
          </div>
        </div>
      </main>

      {/* Pay-Per-View Gate Modal */}
      <PaywallModal
        isOpen={showPaywall && !isUnlocked}
        streamTitle={stream.title}
        onUnlock={() => {
          setIsUnlocked(true);
          setShowPaywall(false);
        }}
      />
    </div>
  );
}
