'use client';

import { getSocket } from '../socket/socketClient';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCViewer {
  private peerConnection: RTCPeerConnection | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private broadcasterSocketId: string | null = null;
  private onTrackCallback?: (stream: MediaStream) => void;
  private onConnectionStateCallback?: (state: RTCPeerConnectionState) => void;

  constructor(
    onTrack?: (stream: MediaStream) => void,
    onStateChange?: (state: RTCPeerConnectionState) => void
  ) {
    this.onTrackCallback = onTrack;
    this.onConnectionStateCallback = onStateChange;
    this.setupSocketListeners();
  }

  public async connect(streamId: string, onTrack?: (stream: MediaStream) => void): Promise<void> {
    if (onTrack) this.onTrackCallback = onTrack;
    this.remoteStream = new MediaStream();
    getSocket().emit('webrtc:viewer-ready', { streamId });
  }

  private setupSocketListeners() {
    const socket = getSocket();

    socket.off('broadcaster:ready');
    socket.on('broadcaster:ready', (data: { streamerSocketId: string }) => {
      this.broadcasterSocketId = data.streamerSocketId;
      socket.emit('webrtc:viewer-ready', { streamId: 'main-stream' });
    });

    socket.off('webrtc:offer');
    socket.on('webrtc:offer', async (data: { offer: RTCSessionDescriptionInit; fromSocketId: string }) => {
      this.broadcasterSocketId = data.fromSocketId;
      await this.handleOffer(data.offer, data.fromSocketId);
    });

    socket.off('webrtc:ice-candidate');
    socket.on('webrtc:ice-candidate', async (data: { candidate: RTCIceCandidateInit; fromSocketId: string }) => {
      if (this.peerConnection && data.candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error('[WebRTCViewer] ICE candidate error:', e);
        }
      }
    });

    socket.off('stream:stopped');
    socket.on('stream:stopped', () => {
      this.disconnect();
    });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit, broadcasterSocketId: string) {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    this.peerConnection.ontrack = (event) => {
      this.remoteStream.addTrack(event.track);
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
      if (this.onConnectionStateCallback) {
        this.onConnectionStateCallback(state);
      }
    };

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      getSocket().emit('webrtc:answer', {
        targetSocketId: broadcasterSocketId,
        answer: this.peerConnection.localDescription,
      });
    } catch (err) {
      console.error('[WebRTCViewer] Error creating answer:', err);
    }
  }

  public disconnect(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream.getTracks().forEach((track) => track.stop());
    this.remoteStream = new MediaStream();
  }
}
