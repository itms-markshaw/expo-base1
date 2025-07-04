/**
 * CRM Lead Services Index
 * Exports all crm.lead model services
 */

export { default as CRMLeadService } from './CRMLeadService';

// Re-export base services for convenience
export {
  BaseChatterService,
  BaseAttachmentsService,
  BaseWorkflowService,
  BaseActionsService
} from '../../base/services';
