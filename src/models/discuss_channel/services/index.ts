/**
 * Discuss Channel Services Index
 * Exports all discuss.channel model services
 */

export { chatService } from './ChatService';
export { hybridChatService } from './HybridChatService';

// Re-export base services for convenience
export {
  BaseChatterService,
  BaseWebSocketService,
  BaseLongpollingService
} from '../../base/services';
