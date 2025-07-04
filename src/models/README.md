# Odoo Models Structure

This directory contains the new organized structure for all Odoo model-specific code, following a systematic approach with numbered screens and logical naming conventions.

## 🏗️ Architecture Overview

### Folder Structure
```
src/models/
├── base/                           # Universal components for all models
│   ├── components/                 # Reusable UI components
│   │   ├── BaseListView.tsx       # Universal list component
│   │   ├── BaseFormView.tsx       # Universal form component
│   │   ├── BaseEditView.tsx       # Universal edit component
│   │   ├── BaseChatter.tsx        # Universal chatter component
│   │   ├── BaseAttachments.tsx    # Universal attachments
│   │   ├── BaseActivities.tsx     # Universal activities
│   │   └── BaseBottomSheet.tsx    # Universal bottom sheet
│   ├── services/                  # Base service classes
│   │   ├── BaseModelService.ts    # Base CRUD operations
│   │   ├── BaseChatterService.ts  # Base chatter functionality
│   │   └── BaseAttachmentService.ts
│   └── types/                     # Base type definitions
│       ├── BaseModel.ts           # Base model interface
│       └── BaseChatter.ts         # Base chatter types
│
├── res_partner/                   # Contacts model (100s series)
│   ├── screens/
│   │   ├── 101_ContactsList.tsx      # Main list view
│   │   ├── 102_ContactDetail.tsx     # Detail/form view (read-only)
│   │   ├── 103_ContactEdit.tsx       # Edit form view
│   │   ├── 104_ContactCreate.tsx     # Create new contact
│   │   ├── 105_ContactBottomSheet.tsx # Quick actions bottom sheet
│   │   ├── 106_ContactChatter.tsx    # Chatter/messages view
│   │   ├── 107_ContactAttachments.tsx # Attachments view
│   │   ├── 108_ContactActivities.tsx  # Activities/tasks view
│   │   └── 109_ContactFilters.tsx    # Advanced filters drawer
│   ├── components/
│   │   ├── ContactCard.tsx           # Individual contact card
│   │   ├── ContactAvatar.tsx         # Contact avatar component
│   │   ├── ContactFields.tsx         # Specific field components
│   │   └── ContactActions.tsx        # Contact-specific actions
│   ├── services/
│   │   ├── ContactService.ts         # Contact-specific operations
│   │   ├── ContactValidation.ts      # Contact validation rules
│   │   └── ContactWorkflows.ts       # Contact-specific workflows
│   └── types/
│       ├── Contact.ts                # Contact model types
│       └── ContactEnums.ts           # Contact-specific enums
│
└── [other_models]/                # Additional models follow same pattern
```

## 📱 Screen Numbering System

### Numbering Logic
- **100s**: Contacts (res.partner)
- **200s**: Sales Orders (sale.order)
- **300s**: CRM Leads (crm.lead)
- **400s**: Employees (hr.employee)
- **500s**: Project Tasks (project.task)
- **600s**: Helpdesk Tickets (helpdesk.ticket)
- **700s**: Products (product.product)
- **800s**: Projects (project.project)
- **900s**: Reserved for future models
- **1000s+**: Additional models

### Standard Screen Numbers (last two digits)
- **01**: List View (main listing with search/filter)
- **02**: Detail View (read-only form view)
- **03**: Edit View (editable form view)
- **04**: Create View (new record creation)
- **05**: Bottom Sheet (quick actions/info)
- **06**: Chatter View (messages/communication)
- **07**: Attachments View (file management)
- **08**: Activities View (tasks/reminders)
- **09**: Model-specific view #1
- **10**: Model-specific view #2
- **11+**: Additional model-specific views

### Examples
- **101**: Contacts List View
- **102**: Contact Detail View
- **106**: Contact Chatter View
- **201**: Sales Orders List View
- **209**: Sales Order Lines View
- **301**: CRM Leads List View
- **309**: Lead Kanban View

## 🔧 Base Components

### BaseListView
Universal list component that provides:
- Search functionality
- Filtering capabilities
- Pull-to-refresh
- Empty states
- Add button
- Consistent styling

### BaseChatter
Universal chatter component that works with any model:
- Messages tab
- Activities tab
- Attachments tab
- Message composer
- Internal notes support
- Real-time updates

### BaseModelService
Base service class providing:
- CRUD operations
- Search functionality
- Offline queue integration
- Error handling
- Local data fallback

## 🚀 Usage Examples

### Creating a New Model
1. Create model directory: `src/models/your_model/`
2. Follow the standard structure
3. Assign screen numbers (next available hundred series)
4. Extend base components and services
5. Update screen registry

### Using Base Components
```typescript
// In your list screen
import BaseListView from '../../base/components/BaseListView';
import { YourModelService } from '../services/YourModelService';

// In your chatter screen
import BaseChatter from '../../base/components/BaseChatter';

<BaseChatter
  modelName="your.model"
  recordId={recordId}
  readonly={false}
/>
```

### Extending Base Service
```typescript
import { BaseModelService } from '../../base/services/BaseModelService';

export class YourModelService extends BaseModelService<YourModel> {
  constructor() {
    super('your.model', DEFAULT_FIELDS, SEARCH_FIELDS);
  }

  // Add model-specific methods
  async getSpecialRecords(): Promise<YourModel[]> {
    return this.searchRead([['special', '=', true]]);
  }
}
```

## 📋 Screen Registry

The screen registry (`src/debug/ScreenRegistry.ts`) provides:
- Complete mapping of screen numbers to components
- Model-to-screen relationships
- Type safety for screen numbers
- AI instruction support

### AI Instructions
When working with AI assistants, you can reference screens by number:
- "Work on screen 107" = Contact Attachments screen
- "Update screen 201" = Sales Orders List screen
- "Create screen 309" = Lead Kanban view

## 🔄 Migration Strategy

### Phase 1: Base Infrastructure ✅
- [x] Create base model structure
- [x] Implement screen registry system
- [x] Create universal components

### Phase 2: Model Migration (In Progress)
- [x] Move contacts (res.partner) to new structure (100s)
- [ ] Move sales orders (sale.order) to new structure (200s)
- [ ] Move CRM leads (crm.lead) to new structure (300s)
- [ ] Move other existing models

### Phase 3: Integration
- [ ] Update navigation to use new screen numbers
- [ ] Integrate with existing sync system
- [ ] Update routing and deep linking

## 🎯 Benefits

### For AI Development
- **Clear Instructions**: "Work on screen 107" = Contact Attachments
- **Logical Grouping**: All contact screens are 10x series
- **Predictable Structure**: Every model follows same pattern
- **Universal Components**: Chatter/attachments work across all models

### For Development Team
- **Consistent Structure**: Every model follows same organization
- **Easy Navigation**: Find any screen by number
- **Reusable Components**: Base components reduce code duplication
- **Scalable Architecture**: Easy to add new models

### For Maintenance
- **Clear Ownership**: Each model has its own folder
- **Isolated Changes**: Model changes don't affect others
- **Easy Testing**: Test individual model components
- **Documentation**: Screen numbers provide clear reference

## 🔗 Integration with Existing Systems

This new structure preserves and enhances your existing:
- ✅ **Sync System**: All models work with existing sync service
- ✅ **Offline Queue**: Base services integrate with offline queue
- ✅ **Conflict Resolution**: Works with existing conflict resolution
- ✅ **Database Service**: Uses existing SQLite database service
- ✅ **Authentication**: Integrates with existing auth service

## 📝 Next Steps

1. **Complete Contact Model**: Finish all 10x screens
2. **Migrate Sales Orders**: Create 20x series screens
3. **Migrate CRM Leads**: Create 30x series screens
4. **Update Navigation**: Integrate with existing navigation
5. **Add Deep Linking**: Support screen number routing
6. **Documentation**: Complete API documentation
