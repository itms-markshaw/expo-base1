/**
 * Discuss Channel Services Index
 * Exports all discuss.channel model services
 */

export { chatService } from './ChatService';
export { channelMemberService } from './ChannelMemberService';
export { default as webRTCService } from './WebRTCService';

// Re-export base services for convenience
export {
  BaseChatterService,
  BaseWebSocketService,
  BaseLongpollingService
} from '../../base/services';
