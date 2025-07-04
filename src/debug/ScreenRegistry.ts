/**
 * Screen Registry for AI Instructions
 * Comprehensive mapping of screen numbers to models and screen types
 */

export interface ScreenRegistryEntry {
  model: string;
  screen: string;
  type: 'list' | 'detail' | 'edit' | 'create' | 'bottomsheet' | 'chatter' | 'attachments' | 'activities' | 'drawer' | 'custom';
  component?: string;
  description?: string;
}

export const SCREEN_REGISTRY = {
  // Contacts (100s) - res.partner
  101: { model: 'res.partner', screen: 'ContactsList', type: 'list', component: '101_ContactsList', description: 'Main contacts list view' },
  102: { model: 'res.partner', screen: 'ContactDetail', type: 'detail', component: '102_ContactDetail', description: 'Contact detail/form view (read-only)' },
  103: { model: 'res.partner', screen: 'ContactEdit', type: 'edit', component: '103_ContactEdit', description: 'Contact edit form view' },
  104: { model: 'res.partner', screen: 'ContactCreate', type: 'create', component: '104_ContactCreate', description: 'Create new contact' },
  105: { model: 'res.partner', screen: 'ContactBottomSheet', type: 'bottomsheet', component: '105_ContactBottomSheet', description: 'Quick actions bottom sheet' },
  106: { model: 'res.partner', screen: 'ContactChatter', type: 'chatter', component: '106_ContactChatter', description: 'Chatter/messages view' },
  107: { model: 'res.partner', screen: 'ContactAttachments', type: 'attachments', component: '107_ContactAttachments', description: 'Attachments view' },
  108: { model: 'res.partner', screen: 'ContactActivities', type: 'activities', component: '108_ContactActivities', description: 'Activities/tasks view' },
  109: { model: 'res.partner', screen: 'ContactFilters', type: 'drawer', component: '109_ContactFilters', description: 'Advanced filters drawer' },

  // Sales Orders (200s) - sale.order
  201: { model: 'sale.order', screen: 'SalesOrdersList', type: 'list', component: '201_SalesOrdersList', description: 'Main sales orders list view' },
  202: { model: 'sale.order', screen: 'SalesOrderDetail', type: 'detail', component: '202_SalesOrderDetail', description: 'Sales order detail/form view (read-only)' },
  203: { model: 'sale.order', screen: 'SalesOrderEdit', type: 'edit', component: '203_SalesOrderEdit', description: 'Sales order edit form view' },
  204: { model: 'sale.order', screen: 'SalesOrderCreate', type: 'create', component: '204_SalesOrderCreate', description: 'Create new sales order' },
  205: { model: 'sale.order', screen: 'SalesOrderBottomSheet', type: 'bottomsheet', component: '205_SalesOrderBottomSheet', description: 'Quick actions bottom sheet' },
  206: { model: 'sale.order', screen: 'SalesOrderChatter', type: 'chatter', component: '206_SalesOrderChatter', description: 'Chatter/messages view' },
  207: { model: 'sale.order', screen: 'SalesOrderAttachments', type: 'attachments', component: '207_SalesOrderAttachments', description: 'Attachments view' },
  208: { model: 'sale.order', screen: 'SalesOrderActivities', type: 'activities', component: '208_SalesOrderActivities', description: 'Activities/tasks view' },
  209: { model: 'sale.order', screen: 'SalesOrderLines', type: 'custom', component: '209_SalesOrderLines', description: 'Order lines specific view' },
  210: { model: 'sale.order', screen: 'SalesOrderWorkflow', type: 'custom', component: '210_SalesOrderWorkflow', description: 'Workflow actions (confirm, cancel, etc.)' },

  // CRM Leads (300s) - crm.lead
  301: { model: 'crm.lead', screen: 'LeadsList', type: 'list', component: '301_LeadsList', description: 'Main leads list view' },
  302: { model: 'crm.lead', screen: 'LeadDetail', type: 'detail', component: '302_LeadDetail', description: 'Lead detail/form view (read-only)' },
  303: { model: 'crm.lead', screen: 'LeadEdit', type: 'edit', component: '303_LeadEdit', description: 'Lead edit form view' },
  304: { model: 'crm.lead', screen: 'LeadCreate', type: 'create', component: '304_LeadCreate', description: 'Create new lead' },
  305: { model: 'crm.lead', screen: 'LeadBottomSheet', type: 'bottomsheet', component: '305_LeadBottomSheet', description: 'Quick actions bottom sheet' },
  306: { model: 'crm.lead', screen: 'LeadChatter', type: 'chatter', component: '306_LeadChatter', description: 'Chatter/messages view' },
  307: { model: 'crm.lead', screen: 'LeadAttachments', type: 'attachments', component: '307_LeadAttachments', description: 'Attachments view' },
  308: { model: 'crm.lead', screen: 'LeadActivities', type: 'activities', component: '308_LeadActivities', description: 'Activities/tasks view' },
  309: { model: 'crm.lead', screen: 'LeadKanban', type: 'custom', component: '309_LeadKanban', description: 'Kanban view for pipeline' },
  310: { model: 'crm.lead', screen: 'LeadConversion', type: 'custom', component: '310_LeadConversion', description: 'Lead to opportunity conversion' },

  // Employees (400s) - hr.employee
  401: { model: 'hr.employee', screen: 'EmployeesList', type: 'list', component: '401_EmployeesList', description: 'Main employees list view' },
  402: { model: 'hr.employee', screen: 'EmployeeDetail', type: 'detail', component: '402_EmployeeDetail', description: 'Employee detail/form view (read-only)' },
  403: { model: 'hr.employee', screen: 'EmployeeEdit', type: 'edit', component: '403_EmployeeEdit', description: 'Employee edit form view' },
  404: { model: 'hr.employee', screen: 'EmployeeCreate', type: 'create', component: '404_EmployeeCreate', description: 'Create new employee' },
  405: { model: 'hr.employee', screen: 'EmployeeBottomSheet', type: 'bottomsheet', component: '405_EmployeeBottomSheet', description: 'Quick actions bottom sheet' },
  406: { model: 'hr.employee', screen: 'EmployeeChatter', type: 'chatter', component: '406_EmployeeChatter', description: 'Chatter/messages view' },
  407: { model: 'hr.employee', screen: 'EmployeeAttachments', type: 'attachments', component: '407_EmployeeAttachments', description: 'Attachments view' },
  408: { model: 'hr.employee', screen: 'EmployeeActivities', type: 'activities', component: '408_EmployeeActivities', description: 'Activities/tasks view' },
  409: { model: 'hr.employee', screen: 'EmployeeDirectory', type: 'custom', component: '409_EmployeeDirectory', description: 'Organization chart view' },

  // Project Tasks (500s) - project.task
  501: { model: 'project.task', screen: 'TasksList', type: 'list', component: '501_TasksList', description: 'Main tasks list view' },
  502: { model: 'project.task', screen: 'TaskDetail', type: 'detail', component: '502_TaskDetail', description: 'Task detail/form view (read-only)' },
  503: { model: 'project.task', screen: 'TaskEdit', type: 'edit', component: '503_TaskEdit', description: 'Task edit form view' },
  504: { model: 'project.task', screen: 'TaskCreate', type: 'create', component: '504_TaskCreate', description: 'Create new task' },
  505: { model: 'project.task', screen: 'TaskBottomSheet', type: 'bottomsheet', component: '505_TaskBottomSheet', description: 'Quick actions bottom sheet' },
  506: { model: 'project.task', screen: 'TaskChatter', type: 'chatter', component: '506_TaskChatter', description: 'Chatter/messages view' },
  507: { model: 'project.task', screen: 'TaskAttachments', type: 'attachments', component: '507_TaskAttachments', description: 'Attachments view' },
  508: { model: 'project.task', screen: 'TaskActivities', type: 'activities', component: '508_TaskActivities', description: 'Activities/tasks view' },
  509: { model: 'project.task', screen: 'TaskKanban', type: 'custom', component: '509_TaskKanban', description: 'Kanban view for task stages' },
  510: { model: 'project.task', screen: 'TaskTimer', type: 'custom', component: '510_TaskTimer', description: 'Task time tracking' },

  // Helpdesk Tickets (600s) - helpdesk.ticket
  601: { model: 'helpdesk.ticket', screen: 'TicketsList', type: 'list', component: '601_TicketsList', description: 'Main tickets list view' },
  602: { model: 'helpdesk.ticket', screen: 'TicketDetail', type: 'detail', component: '602_TicketDetail', description: 'Ticket detail/form view (read-only)' },
  603: { model: 'helpdesk.ticket', screen: 'TicketEdit', type: 'edit', component: '603_TicketEdit', description: 'Ticket edit form view' },
  604: { model: 'helpdesk.ticket', screen: 'TicketCreate', type: 'create', component: '604_TicketCreate', description: 'Create new ticket' },
  605: { model: 'helpdesk.ticket', screen: 'TicketBottomSheet', type: 'bottomsheet', component: '605_TicketBottomSheet', description: 'Quick actions bottom sheet' },
  606: { model: 'helpdesk.ticket', screen: 'TicketChatter', type: 'chatter', component: '606_TicketChatter', description: 'Chatter/messages view' },
  607: { model: 'helpdesk.ticket', screen: 'TicketAttachments', type: 'attachments', component: '607_TicketAttachments', description: 'Attachments view' },
  608: { model: 'helpdesk.ticket', screen: 'TicketActivities', type: 'activities', component: '608_TicketActivities', description: 'Activities/tasks view' },
  609: { model: 'helpdesk.ticket', screen: 'TicketEscalation', type: 'custom', component: '609_TicketEscalation', description: 'Ticket escalation workflow' },

  // Products (700s) - product.product
  701: { model: 'product.product', screen: 'ProductsList', type: 'list', component: '701_ProductsList', description: 'Main products list view' },
  702: { model: 'product.product', screen: 'ProductDetail', type: 'detail', component: '702_ProductDetail', description: 'Product detail/form view (read-only)' },
  703: { model: 'product.product', screen: 'ProductEdit', type: 'edit', component: '703_ProductEdit', description: 'Product edit form view' },
  704: { model: 'product.product', screen: 'ProductCreate', type: 'create', component: '704_ProductCreate', description: 'Create new product' },
  705: { model: 'product.product', screen: 'ProductBottomSheet', type: 'bottomsheet', component: '705_ProductBottomSheet', description: 'Quick actions bottom sheet' },
  706: { model: 'product.product', screen: 'ProductChatter', type: 'chatter', component: '706_ProductChatter', description: 'Chatter/messages view' },
  707: { model: 'product.product', screen: 'ProductAttachments', type: 'attachments', component: '707_ProductAttachments', description: 'Attachments view' },
  708: { model: 'product.product', screen: 'ProductActivities', type: 'activities', component: '708_ProductActivities', description: 'Activities/tasks view' },
  709: { model: 'product.product', screen: 'ProductVariants', type: 'custom', component: '709_ProductVariants', description: 'Product variants view' },

  // Projects (800s) - project.project
  801: { model: 'project.project', screen: 'ProjectsList', type: 'list', component: '801_ProjectsList', description: 'Main projects list view' },
  802: { model: 'project.project', screen: 'ProjectDetail', type: 'detail', component: '802_ProjectDetail', description: 'Project detail/form view (read-only)' },
  803: { model: 'project.project', screen: 'ProjectEdit', type: 'edit', component: '803_ProjectEdit', description: 'Project edit form view' },
  804: { model: 'project.project', screen: 'ProjectCreate', type: 'create', component: '804_ProjectCreate', description: 'Create new project' },
  805: { model: 'project.project', screen: 'ProjectBottomSheet', type: 'bottomsheet', component: '805_ProjectBottomSheet', description: 'Quick actions bottom sheet' },
  806: { model: 'project.project', screen: 'ProjectChatter', type: 'chatter', component: '806_ProjectChatter', description: 'Chatter/messages view' },
  807: { model: 'project.project', screen: 'ProjectAttachments', type: 'attachments', component: '807_ProjectAttachments', description: 'Attachments view' },
  808: { model: 'project.project', screen: 'ProjectActivities', type: 'activities', component: '808_ProjectActivities', description: 'Activities/tasks view' },
  809: { model: 'project.project', screen: 'ProjectDashboard', type: 'custom', component: '809_ProjectDashboard', description: 'Project dashboard with metrics' },

} as const;

export type ScreenNumber = keyof typeof SCREEN_REGISTRY;

export class ScreenRegistryService {
  /**
   * Get screen entry by number
   */
  static getScreen(screenNumber: ScreenNumber): ScreenRegistryEntry | undefined {
    return SCREEN_REGISTRY[screenNumber];
  }

  /**
   * Get all screens for a specific model
   */
  static getScreensForModel(modelName: string): { number: ScreenNumber; entry: ScreenRegistryEntry }[] {
    return Object.entries(SCREEN_REGISTRY)
      .filter(([_, entry]) => entry.model === modelName)
      .map(([number, entry]) => ({ number: parseInt(number) as ScreenNumber, entry }));
  }

  /**
   * Get screens by type
   */
  static getScreensByType(type: ScreenRegistryEntry['type']): { number: ScreenNumber; entry: ScreenRegistryEntry }[] {
    return Object.entries(SCREEN_REGISTRY)
      .filter(([_, entry]) => entry.type === type)
      .map(([number, entry]) => ({ number: parseInt(number) as ScreenNumber, entry }));
  }

  /**
   * Get all models in registry
   */
  static getAllModels(): string[] {
    const models = new Set<string>();
    Object.values(SCREEN_REGISTRY).forEach(entry => models.add(entry.model));
    return Array.from(models);
  }

  /**
   * Get screen number range for model
   */
  static getModelRange(modelName: string): { start: number; end: number } | null {
    const screens = this.getScreensForModel(modelName);
    if (screens.length === 0) return null;

    const numbers = screens.map(s => s.number);
    return {
      start: Math.min(...numbers),
      end: Math.max(...numbers)
    };
  }

  /**
   * Validate screen number
   */
  static isValidScreen(screenNumber: number): boolean {
    return screenNumber in SCREEN_REGISTRY;
  }

  /**
   * Get next available screen number for model
   */
  static getNextScreenNumber(modelName: string): number | null {
    const range = this.getModelRange(modelName);
    if (!range) return null;

    // Find the next available number in the range
    for (let i = range.start; i <= range.start + 99; i++) {
      if (!(i in SCREEN_REGISTRY)) {
        return i;
      }
    }
    return null;
  }
}
