/**
 * Calendar Event Services Index
 * Exports all calendar.event model services
 */

export { default as CalendarEventService } from './CalendarEventService';

// Re-export base services for convenience
export {
  BaseChatterService,
  BaseAttachmentsService,
  BaseWorkflowService
} from '../../base/services';
