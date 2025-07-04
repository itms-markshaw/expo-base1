/**
 * Field Service Services Index
 * Exports all app.field_service model services
 */

export { default as FieldServiceMobileService } from './FieldServiceMobileService';

// Re-export base services for convenience
export {
  BaseChatterService,
  BaseAttachmentsService,
  BaseWorkflowService
} from '../../base/services';
