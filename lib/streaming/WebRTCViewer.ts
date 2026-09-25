'use client';

import { getSocket } from '../socket/socketClient';

function getIceServers(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl) {
    const urls = turnUrl.split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length > 0) {
      iceServers.push({
        urls,
        ...(turnUsername ? { username: turnUsername } : {}),
        ...(turnCredential ? { credential: turnCredential } : {}),
      });
    }
  }

  return {
    iceServers,
    iceCandidatePoolSize: 2,
  };
}

export interface ViewerDiagnostics {
  fps: number;
  bitrateKbps: number;
  packetsLost: number;
  jitter: number;
  rttMs: number;
  framesDropped: number;
  videoTracksCount: number;
  audioTracksCount: number;
  hasAudio: boolean;
  audioLabel?: string;
  connectionState: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
}

export class WebRTCViewer {
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private broadcasterSocketId: string | null = null;
  private currentAttemptId: string = '';
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private onTrackCallback?: (stream: MediaStream) => void;
  private onConnectionStateCallback?: (state: RTCPeerConnectionState) => void;
  private onDiagnosticsCallback?: (stats: ViewerDiagnostics) => void;

  // Retry & Watchdog state
  private isDestroyed: boolean = false;
  private isConnecting: boolean = false;
  private retryCount: number = 0;
  private retryTimeout: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private disconnectGraceTimer: NodeJS.Timeout | null = null;

  // Diagnostics
  private statsInterval: NodeJS.Timeout | null = null;
  private prevBytesReceived = 0;
  private prevTimestamp = 0;

  constructor(
    onTrack?: (stream: MediaStream) => void,
    onStateChange?: (state: RTCPeerConnectionState) => void,
    onDiagnostics?: (stats: ViewerDiagnostics) => void
  ) {
    this.onTrackCallback = onTrack;
    this.onConnectionStateCallback = onStateChange;
    this.onDiagnosticsCallback = onDiagnostics;
    this.setupSocketListeners();
    this.startDiagnostics();
  }

  public async connect(streamId: string = 'main-stream', onTrack?: (stream: MediaStream) => void): Promise<void> {
    if (onTrack) this.onTrackCallback = onTrack;
    this.isDestroyed = false;

    if (this.peerConnection && this.peerConnection.connectionState === 'connected') {
      console.log('[Viewer] WebRTC connection already active.');
      return;
    }

    this.requestOffer();
  }

  public requestOffer(): void {
    if (this.isDestroyed) return;

    this.clearWatchdogTimer();
    this.clearRetryTimeout();

    this.currentAttemptId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.isConnecting = true;

    console.log(`[Viewer] Requesting offer (attempt #${this.retryCount + 1}, id: ${this.currentAttemptId})`);
    if (this.onConnectionStateCallback) {
      this.onConnectionStateCallback('connecting');
    }

    const socket = getSocket();
    socket.emit('webrtc:viewer-ready', {
      streamId: 'main-stream',
      attemptId: this.currentAttemptId,
    });

    // Start 12-second connection watchdog timer
    this.watchdogTimer = setTimeout(() => {
      if (this.isDestroyed) return;
      if (!this.peerConnection || this.peerConnection.connectionState !== 'connected') {
        console.warn('[Viewer] Connection watchdog timed out after 12s without reaching connected state.');
        this.handleConnectionFailure('Watchdog timeout');
      }
    }, 12000);
  }

  private setupSocketListeners() {
    const socket = getSocket();

    // Socket reconnection auto-recovery
    socket.off('connect');
    socket.on('connect', () => {
      console.log('[Viewer] Socket connected. Checking stream status...');
      socket.emit('viewer:join', { streamId: 'main-stream' });
    });

    socket.off('broadcaster:ready');
    socket.on('broadcaster:ready', (data: { streamerSocketId: string }) => {
      this.broadcasterSocketId = data.streamerSocketId;
      console.log(`[Viewer] Stream state: LIVE. Broadcaster ready (${data.streamerSocketId}).`);
      if (!this.peerConnection || this.peerConnection.connectionState !== 'connected') {
        this.requestOffer();
      }
    });

    socket.off('stream:status-changed');
    socket.on('stream:status-changed', (data: { status: string }) => {
      if (data.status === 'live') {
        console.log('[Viewer] Stream state: LIVE. Requesting offer...');
        this.requestOffer();
      } else if (data.status === 'offline') {
        console.log('[Viewer] Stream state: OFFLINE. Disconnecting WebRTC...');
        this.cleanupPeerConnection();
        if (this.onConnectionStateCallback) {
          this.onConnectionStateCallback('closed');
        }
      }
    });

    socket.off('webrtc:offer');
    socket.on('webrtc:offer', async (data: { offer: RTCSessionDescriptionInit; fromSocketId: string; attemptId?: string }) => {
      if (this.isDestroyed) return;

      this.broadcasterSocketId = data.fromSocketId;
      if (data.attemptId) {
        this.currentAttemptId = data.attemptId;
      }

      console.log(`[Viewer] Offer received from ${data.fromSocketId} (attempt: ${this.currentAttemptId})`);
      await this.handleOffer(data.offer, data.fromSocketId);
    });

    socket.off('webrtc:ice-candidate');
    socket.on('webrtc:ice-candidate', async (data: { candidate: RTCIceCandidateInit; fromSocketId: string; attemptId?: string }) => {
      if (this.isDestroyed || !this.peerConnection) return;

      if (data.candidate) {
        if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('[WebRTC] ICE candidate added');
          } catch (e) {
            console.error('[WebRTC] Error adding ICE candidate:', e);
          }
        } else {
          console.log('[WebRTC] ICE candidate queued');
          this.pendingCandidates.push(data.candidate);
        }
      }
    });

    socket.off('stream:stopped');
    socket.on('stream:stopped', () => {
      console.log('[Viewer] Stream stopped by broadcaster.');
      this.cleanupPeerConnection();
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback('closed');
      }
    });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, broadcasterSocketId: string) {
    this.cleanupPeerConnection();

    this.peerConnection = new RTCPeerConnection(getIceServers());
    this.pendingCandidates = [];

    // Track Reception
    this.peerConnection.ontrack = (event) => {
      const track = event.track;
      if (track.kind === 'video') {
        console.log(`[WebRTC Viewer] Remote video track received (${track.label || 'video'})`);
      } else if (track.kind === 'audio') {
        console.log(`[WebRTC Viewer] Remote audio track received (${track.label || 'audio'})`);
      }

      // Idempotently add track to remoteStream
      if (!this.remoteStream.getTrackById(track.id)) {
        this.remoteStream.addTrack(track);
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach((t) => {
          if (!this.remoteStream.getTrackById(t.id)) {
            this.remoteStream.addTrack(t);
          }
        });
      }

      if (this.onTrackCallback) {
        this.onTrackCallback(this.remoteStream);
      }
    };

    // ICE Candidate Generation
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit('webrtc:ice-candidate', {
          targetSocketId: broadcasterSocketId,
          candidate: event.candidate,
          attemptId: this.currentAttemptId,
        });
      }
    };

    // Connection State Change
    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const state = this.peerConnection.connectionState;
      console.log(`[Viewer] Connection state: ${state}`);

      if (state === 'connected') {
        this.isConnecting = false;
        this.retryCount = 0;
        this.clearWatchdogTimer();
        this.clearDisconnectGraceTimer();
        if (this.onConnectionStateCallback) {
          this.onConnectionStateCallback('connected');
        }
      } else if (state === 'failed') {
        this.handleConnectionFailure('connectionState failed');
      } else if (state === 'disconnected') {
        // Allow a 4s grace window for network jitter before forcing reconnect
        this.disconnectGraceTimer = setTimeout(() => {
          if (this.peerConnection?.connectionState === 'disconnected') {
            console.warn('[Viewer] Connection remained disconnected after 4s grace period.');
            this.handleConnectionFailure('Disconnected grace expired');
          }
        }, 4000);
      } else if (state === 'closed') {
        if (this.onConnectionStateCallback) {
          this.onConnectionStateCallback('closed');
        }
      }
    };

    // ICE Connection State Change
    this.peerConnection.oniceconnectionstatechange = () => {
      if (!this.peerConnection) return;
      const iceState = this.peerConnection.iceConnectionState;
      console.log(`[WebRTC] ICE connection state: ${iceState}`);

      if (iceState === 'connected' || iceState === 'completed') {
        this.clearDisconnectGraceTimer();
      } else if (iceState === 'failed') {
        this.handleConnectionFailure('ICE connection failed');
      }
    };

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[Viewer] Remote description set');

      // Drain queued ICE candidates
      for (const cand of this.pendingCandidates) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch((e) =>
          console.warn('[WebRTC] Error draining ICE candidate:', e)
        );
        console.log('[WebRTC] ICE candidate added from queue');
      }
      this.pendingCandidates = [];

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      getSocket().emit('webrtc:answer', {
        targetSocketId: broadcasterSocketId,
        answer: this.peerConnection.localDescription,
        attemptId: this.currentAttemptId,
      });

      console.log('[Viewer] Answer sent');
    } catch (err) {
      console.error('[Viewer] Error handling offer:', err);
      this.handleConnectionFailure('Offer processing error');
    }
  }

  private handleConnectionFailure(reason: string) {
    if (this.isDestroyed) return;

    console.warn(`[Viewer] WebRTC connection failed: ${reason}`);
    this.cleanupPeerConnection();

    // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
    const delay = Math.min(10000, 1000 * Math.pow(2, this.retryCount));
    this.retryCount++;

    console.log(`[Viewer] Reconnecting attempt #${this.retryCount} in ${(delay / 1000).toFixed(1)}s...`);

    if (this.onConnectionStateCallback) {
      this.onConnectionStateCallback('connecting');
    }

    this.clearRetryTimeout();
    this.retryTimeout = setTimeout(() => {
      this.requestOffer();
    }, delay);
  }

  private clearWatchdogTimer() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private clearRetryTimeout() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private clearDisconnectGraceTimer() {
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }
  }

  private cleanupPeerConnection() {
    this.clearWatchdogTimer();
    this.clearDisconnectGraceTimer();

    if (this.peerConnection) {
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.pendingCandidates = [];
  }

  private startDiagnostics() {
    this.statsInterval = setInterval(async () => {
      if (!this.peerConnection || this.peerConnection.connectionState !== 'connected') {
        if (this.onDiagnosticsCallback) {
          const videoTracks = this.remoteStream.getVideoTracks();
          const audioTracks = this.remoteStream.getAudioTracks();
          this.onDiagnosticsCallback({
            fps: 0,
            bitrateKbps: 0,
            packetsLost: 0,
            jitter: 0,
            rttMs: 0,
            framesDropped: 0,
            videoTracksCount: videoTracks.length,
            audioTracksCount: audioTracks.length,
            hasAudio: audioTracks.length > 0,
            audioLabel: audioTracks[0]?.label,
            connectionState: this.peerConnection?.connectionState || 'closed',
            iceState: this.peerConnection?.iceConnectionState || 'closed',
          });
        }
        return;
      }

      try {
        const stats = await this.peerConnection.getStats();
        let fps = 0;
        let bitrateKbps = 0;
        let packetsLost = 0;
        let jitter = 0;
        let rttMs = 0;
        let framesDropped = 0;
        const now = Date.now();

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.framesPerSecond) fps = Math.round(report.framesPerSecond);
            if (report.packetsLost) packetsLost = report.packetsLost;
            if (report.jitter) jitter = Math.round(report.jitter * 1000);
            if (report.framesDropped) framesDropped = report.framesDropped;

            if (report.bytesReceived) {
              if (this.prevBytesReceived > 0 && this.prevTimestamp > 0) {
                const deltaBytes = report.bytesReceived - this.prevBytesReceived;
                const deltaTime = (now - this.prevTimestamp) / 1000;
                if (deltaTime > 0) {
                  bitrateKbps = Math.round((deltaBytes * 8) / (deltaTime * 1000));
                }
              }
              this.prevBytesReceived = report.bytesReceived;
              this.prevTimestamp = now;
            }
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
              rttMs = Math.round(report.currentRoundTripTime * 1000);
            }
          }
        });

        const videoTracks = this.remoteStream.getVideoTracks();
        const audioTracks = this.remoteStream.getAudioTracks();

        if (this.onDiagnosticsCallback) {
          this.onDiagnosticsCallback({
            fps: fps || 30,
            bitrateKbps,
            packetsLost,
            jitter,
            rttMs,
            framesDropped,
            videoTracksCount: videoTracks.length,
            audioTracksCount: audioTracks.length,
            hasAudio: audioTracks.length > 0,
            audioLabel: audioTracks[0]?.label,
            connectionState: this.peerConnection.connectionState,
            iceState: this.peerConnection.iceConnectionState,
          });
        }
      } catch (e) {}
    }, 3000);
  }

  public disconnect(): void {
    this.isDestroyed = true;
    this.clearWatchdogTimer();
    this.clearRetryTimeout();
    this.clearDisconnectGraceTimer();

    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.cleanupPeerConnection();

    this.prevBytesReceived = 0;
    this.prevTimestamp = 0;
    this.remoteStream.getTracks().forEach((track) => track.stop());
    this.remoteStream = new MediaStream();
  }
}
