/**
 * Base Services Index
 * Exports all universal base services for reuse across models
 */

// Core Base Services
export { default as BaseOdooClient } from './BaseOdooClient';
export { default as BaseAuthService } from './BaseAuthService';
export { default as BaseDatabaseService } from './BaseDatabaseService';
export { default as BaseSyncService } from './BaseSyncService';

// Universal Feature Services
export { default as BaseChatterService } from './BaseChatterService';
export { default as BaseAttachmentsService } from './BaseAttachmentsService';
export { default as BaseWorkflowService } from './BaseWorkflowService';
export { default as BaseActionsService } from './BaseActionsService';
export { default as BaseReportingService } from './BaseReportingService';
export { default as AttachmentService } from './BC-S007_AttachmentService';

// Communication Services
export { default as BaseWebSocketService } from './BaseWebSocketService';
export { default as BaseSessionWebSocketService } from './BaseSessionWebSocketService';
export { default as BaseLongpollingService } from './BaseLongpollingService';

// Service Types
export type {
  OdooRecord,
  AuthResult,
  User,
  SyncStatus,
  SyncSettings
} from '../../../types';
