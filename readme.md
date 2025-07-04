# Expo Odoo Mobile App

[![React Native](https://img.shields.io/badge/React%20Native-0.79.4-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~53.0.0-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)](https://www.typescriptlang.org/)
[![Odoo](https://img.shields.io/badge/Odoo-18-purple.svg)](https://odoo.com/)

Professional Expo React Native app for Odoo 18 with offline-first architecture, modern screen numbering system, and AI-friendly development patterns.

## 🏗️ Architecture Overview

### Core Stack
- **Frontend**: Expo 53 + React Native 0.79.4 + TypeScript
- **Backend**: Odoo 18 (XML-RPC API)
- **State**: Zustand store with persistence
- **Navigation**: React Navigation 6 (Stack + Bottom Tabs)
- **Database**: SQLite (expo-sqlite) for offline storage
- **UI**: Custom components + Material Icons

### Project Structure
```
src/
├── components/           # Global UI components
│   ├── AppNavigationProvider.tsx
│   ├── CustomBottomNavigation.tsx
│   ├── ScreenWrapper.tsx
│   ├── ScreenBadge.tsx
│   └── LoadingScreen.tsx
├── config/              # App configuration
│   └── odoo.ts         # Odoo connection settings
├── debug/              # Development tools
│   └── ScreenRegistry.ts # Screen mapping for AI
├── models/             # Model-specific code (main architecture)
│   ├── base/           # Universal components/services
│   ├── res_partner/    # Contacts (100s series)
│   ├── sale_order/     # Sales Orders (200s series)
│   ├── crm_lead/       # CRM Leads (300s series)
│   ├── hr_employee/    # Employees (400s series)
│   ├── mail_activity/  # Activities (500s series)
│   ├── helpdesk_ticket/ # Helpdesk (600s series)
│   ├── calendar_event/ # Calendar (700s series)
│   ├── app_field_service/ # Field Service (800s series)
│   ├── app_settings/   # Settings (900s series)
│   └── sync_management/ # Sync System (980s series)
├── navigation/         # Navigation configuration
├── store/             # Global state management
├── types/             # Global TypeScript types
└── utils/             # Utility functions
```

## 📱 Screen Numbering System

### Numbering Logic
Each model gets a **100-number range** with standardized screen types:

| Range | Model | Description |
|-------|--------|-------------|
| **100s** | `res.partner` | Contacts management |
| **200s** | `sale.order` | Sales orders & quotations |
| **300s** | `crm.lead` | CRM leads & opportunities |
| **400s** | `hr.employee` | Employee management |
| **500s** | `mail.activity` | Activities & tasks |
| **600s** | `helpdesk.ticket` | Support tickets |
| **700s** | `calendar.event` | Calendar & events |
| **800s** | `app_field_service` | Field service operations |
| **900s** | `app_settings` | App configuration |
| **950s** | `app_testing` | Development tools |
| **980s** | `sync_management` | Offline sync system |
| **990s** | `app_auth` | Authentication |

### Standard Screen Numbers (Last 2 Digits)
| Number | Type | Description |
|--------|------|-------------|
| **x01** | `list` | Main list view with search/filters |
| **x02** | `detail` | Read-only detail/form view |
| **x03** | `edit` | Editable form view |
| **x04** | `create` | New record creation |
| **x05** | `bottomsheet` | Quick actions bottom sheet |
| **x06** | `chatter` | Messages/communication |
| **x07** | `attachments` | File management |
| **x08** | `activities` | Tasks/reminders |
| **x09+** | `custom` | Model-specific views |

### Examples
- **101**: Contacts List (`res_partner/screens/101_ContactsList.tsx`)
- **102**: Contact Detail (`res_partner/screens/102_ContactDetail.tsx`)
- **201**: Sales Orders List (`sale_order/screens/201_SalesOrdersList.tsx`)
- **209**: Sales Order Lines (`sale_order/screens/209_SalesOrderLines.tsx`)
- **601**: Helpdesk Tickets List (`helpdesk_ticket/screens/601_HelpdeskTicketsList.tsx`)

## 🔧 Development Guidelines

### Creating New Screens

1. **Determine Screen Number**
   ```typescript
   // Check ScreenRegistry for next available number
   import { SCREEN_REGISTRY } from '../debug/ScreenRegistry';
   // Example: 309 = Lead Kanban View
   ```

2. **File Naming Convention**
   ```
   src/models/[model_name]/screens/[XXX]_[ScreenName].tsx
   ```

3. **Screen Template**
   ```typescript
   /**
    * XXX_ScreenName - Description
    * Screen Number: XXX
    * Model: model.name
    * Type: list|detail|edit|create|bottomsheet|chatter|attachments|activities|custom
    */
   
   import React from 'react';
   import ScreenBadge from '../../../components/ScreenBadge';
   
   export default function ScreenName() {
     return (
       <SafeAreaView style={styles.container}>
         {/* Screen content */}
         <ScreenBadge screenNumber={XXX} />
       </SafeAreaView>
     );
   }
   ```

### Model Structure Template

```
src/models/[model_name]/
├── components/          # Model-specific UI components
│   ├── [Model]Card.tsx     # List item component
│   ├── [Model]Form.tsx     # Form fields component
│   └── index.ts            # Export barrel
├── screens/            # Numbered screen components
│   ├── X01_[Model]List.tsx     # Main list view
│   ├── X02_[Model]Detail.tsx   # Detail view
│   ├── X03_[Model]Edit.tsx     # Edit form
│   ├── X04_[Model]Create.tsx   # Create form
│   └── ...                     # Additional screens
├── services/           # Business logic & API calls
│   ├── [Model]Service.ts       # Main service class
│   └── index.ts               # Export barrel
└── types/             # TypeScript definitions
    ├── [Model].ts             # Model interface & enums
    └── index.ts               # Export barrel
```

### Base Components Usage

#### BaseListView
Universal list component for all models:
```typescript
import BaseListView from '../../base/components/BaseListView';

<BaseListView
  data={items}
  loading={loading}
  refreshing={refreshing}
  onRefresh={handleRefresh}
  renderItem={renderItem}
  headerTitle="Items"
  searchQuery={searchQuery}
  onSearchChange={handleSearch}
  filters={filters}
  activeFilter={activeFilter}
  onFilterChange={handleFilterChange}
  showAddButton={true}
  onAddPress={handleAdd}
/>
```

#### BaseChatter
Universal communication component:
```typescript
import BaseChatter from '../../base/components/BaseChatter';

<BaseChatter
  modelName="sale.order"
  recordId={orderId}
  readonly={false}
/>
```

### Service Layer Pattern

Extend BaseModelService for consistent CRUD operations:
```typescript
import { BaseModelService } from '../../base/services/BaseModelService';

export class ContactService extends BaseModelService<Contact> {
  constructor() {
    super('res.partner', DEFAULT_FIELDS, SEARCH_FIELDS);
  }

  // Model-specific methods
  async searchContacts(params: ContactSearchParams): Promise<Contact[]> {
    return this.searchRead(this.buildDomain(params));
  }
}

export const contactService = new ContactService();
```

## 🚀 AI Development Instructions

### For AI Assistants Working on This Project

#### Screen References
Use screen numbers for precise instructions:
- **"Work on screen 107"** = Contact Attachments screen
- **"Update screen 201"** = Sales Orders List screen  
- **"Create screen 309"** = New Lead Kanban view

#### Model Structure
When adding new functionality:
1. **Identify target model** (e.g., `res.partner`, `sale.order`)
2. **Check screen registry** for existing screens
3. **Follow naming conventions** strictly
4. **Use base components** when possible
5. **Add screen badge** for development tracking

#### Common Tasks
- **Add new screen**: Check `ScreenRegistry.ts` for next number, create in correct model folder
- **Modify existing screen**: Reference by number (e.g., "update screen 102")
- **Add model**: Create new folder structure, assign 100-number range
- **Debug screens**: Use screen badges to identify components

#### Screen Registry Reference
```typescript
import { SCREEN_REGISTRY, ScreenRegistryService } from '../debug/ScreenRegistry';

// Get screen info
const screen = ScreenRegistryService.getScreen(101);
// { model: 'res.partner', screen: 'ContactsList', type: 'list', ... }

// Get all screens for model
const contactScreens = ScreenRegistryService.getScreensForModel('res.partner');

// Get next available number
const nextNumber = ScreenRegistryService.getNextScreenNumber('res.partner');
```

## 🔄 Sync System

### Offline-First Architecture
- **SQLite**: Local database for offline data
- **Queue System**: Offline operations queue
- **Conflict Resolution**: Automatic and manual conflict handling
- **Auto-Sync**: Background synchronization
- **Model Selection**: Choose which models to sync

### Sync Management Screens (980s Series)
- **981**: Sync Dashboard - Main sync control center
- **982**: Model Selection - Choose models to sync
- **983**: Custom Model Selection - Advanced model configuration
- **984**: Template Model Selection - Predefined model sets
- **985**: Sync Settings - Sync preferences and schedules
- **986**: Sync Progress - Real-time sync monitoring
- **987**: Conflict Resolution - Handle data conflicts
- **988**: Offline Queue - Manage pending operations
- **989**: Database Manager - SQLite data management

## 🛠️ Development Tools

### Screen Badges
Development badges show screen numbers on each screen:
```typescript
import ScreenBadge from '../../../components/ScreenBadge';

<ScreenBadge 
  screenNumber={101} 
  position="top-right"
  size="medium" 
/>
```

### Debug Registry
Complete mapping for AI development:
```typescript
// Check screen 101 details
const screen101 = SCREEN_REGISTRY[101];
// { model: 'res.partner', screen: 'ContactsList', type: 'list', ... }
```

## 📋 Key Features

### ✅ Implemented
- **Screen Numbering System**: Complete 3-digit numbering
- **Base Components**: Universal list, chatter, forms
- **Model Architecture**: Standardized folder structure
- **Navigation System**: Stack + bottom tab navigation
- **Offline Sync**: SQLite + queue system
- **Development Tools**: Screen badges, registry
- **Authentication**: Odoo login integration
- **State Management**: Zustand with persistence

### 🚧 In Progress
- **Additional Models**: More Odoo model integrations
- **Advanced Filters**: Enhanced filtering capabilities
- **Real-time Updates**: WebSocket integration
- **Performance**: Optimization and caching

## 🔗 Integration Points

### Odoo 18 Integration
- **XML-RPC API**: Full CRUD operations
- **Authentication**: Session management
- **Models**: Contacts, Sales, CRM, HR, Projects, Helpdesk
- **Real-time**: Message polling and notifications

### Mobile Features
- **Camera**: Photo capture and documentation
- **GPS**: Location tracking for field service
- **Offline**: Full offline capability
- **Push Notifications**: Task and message alerts

## 📱 Navigation Structure

### Bottom Tabs (Primary)
1. **Dashboard** - Main overview (001)
2. **Sales** - Sales orders (201)
3. **Contacts** - Customer contacts (101)
4. **Calendar** - Events and meetings (701)
5. **More** - Secondary navigation (991)

### Secondary Screens (Stack Navigation)
All other screens accessible via navigation with proper back buttons and bottom navigation overlay.

## 🎯 Best Practices

### Code Organization
- **One screen per file** with clear naming
- **Consistent imports** and exports
- **TypeScript** for all components
- **Error handling** in all async operations
- **Loading states** for all data operations

### UI/UX Patterns
- **Screen badges** for development identification
- **Consistent styling** using StyleSheet
- **Material Design** icons throughout
- **Loading states** and empty states
- **Pull-to-refresh** on all lists

### Performance
- **Lazy loading** for large lists
- **Image optimization** for attachments
- **Background sync** for offline operations
- **Memory management** for large datasets

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

**For AI Development**: Always reference screen numbers (e.g., "work on screen 107") and follow the established patterns. The screen registry provides complete mapping for all components.