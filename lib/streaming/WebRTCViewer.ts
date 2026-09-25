'use client';

import { getSocket } from '../socket/socketClient';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 2,
};

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
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private onTrackCallback?: (stream: MediaStream) => void;
  private onConnectionStateCallback?: (state: RTCPeerConnectionState) => void;
  private onDiagnosticsCallback?: (stats: ViewerDiagnostics) => void;
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

  public async connect(streamId: string, onTrack?: (stream: MediaStream) => void): Promise<void> {
    if (onTrack) this.onTrackCallback = onTrack;

    if (
      this.peerConnection &&
      (this.peerConnection.connectionState === 'connected' ||
        this.peerConnection.connectionState === 'connecting')
    ) {
      console.log('[WebRTCViewer] Already connected or connecting, skipping redundant join.');
      return;
    }

    console.log('[WebRTCViewer] Sending viewer-ready signal...');
    getSocket().emit('webrtc:viewer-ready', { streamId });
  }

  private setupSocketListeners() {
    const socket = getSocket();

    socket.off('broadcaster:ready');
    socket.on('broadcaster:ready', (data: { streamerSocketId: string }) => {
      this.broadcasterSocketId = data.streamerSocketId;
      console.log(`[WebRTCViewer] Broadcaster is ready (${data.streamerSocketId}). Signaling readiness...`);
      socket.emit('webrtc:viewer-ready', { streamId: 'main-stream' });
    });

    socket.off('webrtc:offer');
    socket.on('webrtc:offer', async (data: { offer: RTCSessionDescriptionInit; fromSocketId: string }) => {
      this.broadcasterSocketId = data.fromSocketId;
      console.log(`[WebRTCViewer] Received WebRTC offer from broadcaster (${data.fromSocketId})`);
      await this.handleOffer(data.offer, data.fromSocketId);
    });

    socket.off('webrtc:ice-candidate');
    socket.on('webrtc:ice-candidate', async (data: { candidate: RTCIceCandidateInit; fromSocketId: string }) => {
      if (this.peerConnection && data.candidate) {
        if (this.peerConnection.remoteDescription && this.peerConnection.remoteDescription.type) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('[WebRTCViewer] ICE candidate error:', e);
          }
        } else {
          this.pendingCandidates.push(data.candidate);
        }
      }
    });

    socket.off('stream:stopped');
    socket.on('stream:stopped', () => {
      console.log('[WebRTCViewer] Stream stopped by broadcaster.');
      this.disconnect();
    });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, broadcasterSocketId: string) {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();
    this.pendingCandidates = [];

    this.peerConnection.ontrack = (event) => {
      console.log(
        `[WebRTCViewer] Remote track received: [${event.track.kind}] (${event.track.label || 'unnamed'})`
      );

      // Attach stream tracks
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }

      if (this.onTrackCallback) {
        this.onTrackCallback(this.remoteStream);
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit('webrtc:ice-candidate', {
          targetSocketId: broadcasterSocketId,
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState || 'closed';
      console.log(`[WebRTCViewer] Connection state: ${state}`);
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback(state);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(`[WebRTCViewer] ICE connection state: ${this.peerConnection?.iceConnectionState}`);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log(`[WebRTCViewer] Signaling state: ${this.peerConnection?.signalingState}`);
    };

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[WebRTCViewer] Remote description set.');

      // Drain queued ICE candidates
      for (const cand of this.pendingCandidates) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch((e) =>
          console.warn('[WebRTCViewer] Error draining ICE candidate:', e)
        );
      }
      this.pendingCandidates = [];

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      getSocket().emit('webrtc:answer', {
        targetSocketId: broadcasterSocketId,
        answer: this.peerConnection.localDescription,
      });

      console.log(`[WebRTCViewer] Created and sent answer to broadcaster (${broadcasterSocketId})`);
    } catch (err) {
      console.error('[WebRTCViewer] Error handling offer:', err);
    }
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
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.pendingCandidates = [];
    this.prevBytesReceived = 0;
    this.prevTimestamp = 0;

    this.remoteStream.getTracks().forEach((track) => track.stop());
    this.remoteStream = new MediaStream();
  }
}
