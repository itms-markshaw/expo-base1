/**
 * Web fallback for react-native-webrtc
 * Provides empty implementations to prevent web build errors
 */

export const mediaDevices = {
  getUserMedia: () => Promise.reject(new Error('WebRTC not supported on web')),
};

export class RTCPeerConnection {
  constructor() {
    throw new Error('WebRTC not supported on web');
  }
}

export class RTCIceCandidate {
  constructor() {
    throw new Error('WebRTC not supported on web');
  }
}

export class RTCSessionDescription {
  constructor() {
    throw new Error('WebRTC not supported on web');
  }
}

export class MediaStream {
  constructor() {
    throw new Error('WebRTC not supported on web');
  }
}

// Default export
export default {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
};
