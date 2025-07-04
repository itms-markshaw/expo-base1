/**
 * Testing Services Index
 * Exports all app.testing model services
 */

export { crudTestingService } from './CRUDTestingService';

// Re-export base services for convenience
export {
  BaseOdooClient,
  BaseAuthService,
  BaseDatabaseService
} from '../../base/services';
