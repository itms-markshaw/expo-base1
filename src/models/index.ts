/**
 * Models Index - Master Export for All Model Services
 * Provides centralized access to all model services and components
 */

// Base Services (Universal)
export * from './base/services';

// Model-Specific Services
export * from './calendar_event/services';
export * from './crm_lead/services';
export * from './discuss_channel/services';
export * from './app_field_service/services';
export * from './app_testing/services';
export * from './sync_management/services';

// Core Services (migrated to base services)
export { authService } from './base/services/BaseAuthService';
export { databaseService } from './base/services/BaseDatabaseService';
export { syncService } from './base/services/BaseSyncService';
export { OdooXMLRPCClient } from './base/services/BaseOdooClient';

// Service Categories for Easy Access
export const BaseServices = {
  // Core
  OdooClient: () => import('./base/services/BaseOdooClient'),
  Auth: () => import('./base/services/BaseAuthService'),
  Database: () => import('./base/services/BaseDatabaseService'),
  Sync: () => import('./base/services/BaseSyncService'),
  
  // Universal Features
  Chatter: () => import('./base/services/BaseChatterService'),
  Attachments: () => import('./base/services/BaseAttachmentsService'),
  Workflow: () => import('./base/services/BaseWorkflowService'),
  Actions: () => import('./base/services/BaseActionsService'),
  Reporting: () => import('./base/services/BaseReportingService'),
  
  // Communication
  WebSocket: () => import('./base/services/BaseWebSocketService'),
  Longpolling: () => import('./base/services/BaseLongpollingService'),
};

export const ModelServices = {
  Calendar: () => import('./calendar_event/services'),
  CRM: () => import('./crm_lead/services'),
  Chat: () => import('./discuss_channel/services'),
  FieldService: () => import('./app_field_service/services'),
  Testing: () => import('./app_testing/services'),
  Sync: () => import('./sync_management/services'),
};
