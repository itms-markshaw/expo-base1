# Expo Odoo Mobile App - AI Development Guide

[![React Native](https://img.shields.io/badge/React%20Native-0.79.4-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~53.0.0-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.0-blue.svg)](https://www.typescriptlang.org/)
[![Odoo](https://img.shields.io/badge/Odoo-18-purple.svg)](https://odoo.com/)

Professional Expo React Native application for Odoo 18 with **offline-first architecture**, **modern screen numbering system**, and **AI-friendly development patterns**. This app is specifically designed for seamless AI-assisted development with clear architectural patterns and numbered screen references.

## 🏗️ Architecture Overview

### Core Technology Stack
- **Frontend**: Expo 53.0 + React Native 0.79.4 + TypeScript 5.3
- **Backend**: Odoo 18 XML-RPC API integration
- **State Management**: Zustand with AsyncStorage persistence
- **Navigation**: React Navigation 6 (Stack + Bottom Tabs)
- **Database**: SQLite (expo-sqlite) for offline-first storage
- **UI Framework**: Custom components + Material Design Icons
- **Development**: AI-optimized with screen registry and numbering system

### Project Architecture
```
expo-base1/
├── App.tsx                      # Main app entry point
├── src/
│   ├── components/              # Global UI components
│   │   ├── AppNavigationProvider.tsx    # Navigation context
│   │   ├── CustomBottomNavigation.tsx   # Bottom nav overlay
│   │   ├── ScreenWrapper.tsx            # Screen container
│   │   ├── ScreenBadge.tsx             # Development badges
│   │   └── LoadingScreen.tsx           # Global loading
│   ├── config/
│   │   └── odoo.ts             # Odoo server configuration
│   ├── debug/
│   │   └── ScreenRegistry.ts   # AI-friendly screen mapping
│   ├── models/                 # 🎯 MAIN ARCHITECTURE
│   │   ├── base/              # Universal base classes
│   │   │   ├── components/    # Reusable UI components
│   │   │   │   ├── BaseListView.tsx        # Universal list
│   │   │   │   ├── BaseFormView.tsx        # Universal form
│   │   │   │   ├── BaseChatter.tsx         # Universal chatter
│   │   │   │   ├── BaseBottomSheet.tsx     # Universal bottom sheet
│   │   │   │   └── index.ts               # Export barrel
│   │   │   ├── services/      # Base service classes
│   │   │   │   ├── BaseModelService.ts     # CRUD operations
│   │   │   │   ├── BaseAuthService.ts      # Authentication
│   │   │   │   ├── BaseDatabaseService.ts  # SQLite operations
│   │   │   │   └── index.ts               # Export barrel
│   │   │   └── types/         # Base TypeScript definitions
│   │   │       ├── BaseModel.ts           # Core interfaces
│   │   │       └── BaseChatter.ts         # Chatter types
│   │   ├── res_partner/       # 100s - Contacts Management
│   │   │   ├── screens/
│   │   │   │   ├── 101_ContactsList.tsx      # List view ✅
│   │   │   │   ├── 102_ContactDetail.tsx     # Detail view ✅
│   │   │   │   ├── 103_ContactEdit.tsx       # Edit form ✅
│   │   │   │   ├── 104_ContactCreate.tsx     # Create form ✅
│   │   │   │   ├── 105_ContactBottomSheet.tsx # Quick actions ✅
│   │   │   │   ├── 106_ContactChatter.tsx    # Messages ✅
│   │   │   │   ├── 107_ContactAttachments.tsx # Files ✅
│   │   │   │   └── 108_ContactActivities.tsx # Tasks ✅
│   │   │   ├── components/
│   │   │   │   ├── ContactCard.tsx           # List item
│   │   │   │   └── ContactDetailBottomSheet.tsx
│   │   │   ├── services/
│   │   │   │   └── ContactService.ts         # Contact operations
│   │   │   └── types/
│   │   │       └── Contact.ts               # Contact interfaces
│   │   ├── sale_order/        # 200s - Sales Management
│   │   │   ├── screens/
│   │   │   │   ├── 201_SalesOrdersList.tsx   # List view ✅
│   │   │   │   ├── 202_SalesOrderDetail.tsx  # Detail view ✅
│   │   │   │   ├── 203_SalesOrderEdit.tsx    # Edit form
│   │   │   │   ├── 204_SalesOrderCreate.tsx  # Create form
│   │   │   │   ├── 205_SalesOrderBottomSheet.tsx # Quick actions
│   │   │   │   ├── 206_SalesOrderChatter.tsx # Messages
│   │   │   │   ├── 209_SalesOrderLines.tsx   # Order lines ✅
│   │   │   │   └── 210_SalesOrderWorkflow.tsx # Workflow actions
│   │   │   └── [similar structure...]
│   │   ├── crm_lead/          # 300s - CRM Leads
│   │   ├── hr_employee/       # 400s - Employees
│   │   ├── mail_activity/     # 500s - Activities & Tasks
│   │   ├── helpdesk_ticket/   # 600s - Support Tickets
│   │   ├── calendar_event/    # 700s - Calendar & Events
│   │   ├── app_field_service/ # 800s - Field Service
│   │   ├── app_settings/      # 900s - App Settings
│   │   ├── app_testing/       # 950s - Development Tools
│   │   ├── sync_management/   # 980s - Offline Sync System
│   │   └── app_auth/          # 990s - Authentication
│   ├── navigation/
│   │   └── NavigationConfig.ts # Navigation configuration
│   ├── store/                 # Global state management
│   │   ├── AppStoreProvider.tsx
│   │   └── index.ts
│   ├── types/                 # Global TypeScript types
│   └── utils/                 # Utility functions
└── package.json
```

## 📱 Screen Numbering System (AI Instructions)

### 🎯 **How to Reference Screens for AI Development**

Use **3-digit screen numbers** for precise AI instructions:
- **"Work on screen 107"** = Contact Attachments screen
- **"Update screen 201"** = Sales Orders List screen
- **"Create screen 309"** = New Lead Kanban view
- **"Debug screen 982"** = Model Selection screen

### 📊 **Model Ranges & Screen Numbers**

| Range | Model | Odoo Model | Status | Description |
|-------|-------|------------|--------|-------------|
| **100-199** | `res_partner` | `res.partner` | ✅ Complete | Contacts & Customer Management |
| **200-299** | `sale_order` | `sale.order` | 🔄 In Progress | Sales Orders & Quotations |
| **300-399** | `crm_lead` | `crm.lead` | 🔄 Started | CRM Leads & Opportunities |
| **400-499** | `hr_employee` | `hr.employee` | 🔄 Started | Employee Management |
| **500-599** | `mail_activity` | `mail.activity` | ✅ Complete | Activities & Tasks |
| **600-699** | `helpdesk_ticket` | `helpdesk.ticket` | 🔄 Started | Support Tickets |
| **700-799** | `calendar_event` | `calendar.event` | ✅ Complete | Calendar & Events |
| **800-899** | `app_field_service` | Custom | ✅ Complete | Field Service Operations |
| **900-949** | `app_settings` | Custom | ✅ Complete | App Configuration |
| **950-979** | `app_testing` | Custom | ✅ Complete | Development & Testing |
| **980-989** | `sync_management` | Custom | ✅ Complete | Offline Sync System |
| **990-999** | `app_auth` | Custom | ✅ Complete | Authentication |

### 🔢 **Standard Screen Types (Last 2 Digits)**

| Number | Type | Component | Usage | AI Instruction |
|--------|------|-----------|--------|----------------|
| **x01** | `list` | `BaseListView` | Main listing with search/filters | "list screen" |
| **x02** | `detail` | `BaseFormView` | Read-only detail/form view | "detail screen" |
| **x03** | `edit` | `BaseFormView` | Editable form view | "edit screen" |
| **x04** | `create` | `BaseFormView` | New record creation | "create screen" |
| **x05** | `bottomsheet` | `BaseBottomSheet` | Quick actions bottom sheet | "bottom sheet" |
| **x06** | `chatter` | `BaseChatter` | Messages/communication | "chatter screen" |
| **x07** | `attachments` | `BaseAttachments` | File management | "attachments screen" |
| **x08** | `activities` | `BaseActivities` | Tasks/reminders | "activities screen" |
| **x09** | `custom` | Custom | Model-specific view #1 | "custom screen 1" |
| **x10** | `custom` | Custom | Model-specific view #2 | "custom screen 2" |

### 🎮 **Example Screen References**

```typescript
// Contact Management (100s)
101 = ContactsList           // "work on contacts list screen"
102 = ContactDetail          // "update contact detail screen"
107 = ContactAttachments     // "fix attachments screen for contacts"

// Sales Orders (200s)
201 = SalesOrdersList        // "modify sales list screen"
209 = SalesOrderLines        // "add order lines screen"
210 = SalesOrderWorkflow     // "create workflow screen"

// Sync System (980s)
981 = SyncDashboard          // "update sync dashboard"
982 = ModelSelection         // "work on model selection screen"
987 = ConflictResolution     // "improve conflict resolution screen"
```

## 🤖 AI Development Instructions

### 🎯 **For AI Assistants: How to Work with This Project**

#### **1. Screen Identification**
Always use screen numbers for precision:
```typescript
import { SCREEN_REGISTRY } from '../debug/ScreenRegistry';

// Get screen info
const screen = SCREEN_REGISTRY[101];
// Returns: { model: 'res.partner', screen: 'ContactsList', type: 'list', ... }
```

#### **2. File Location Pattern**
```typescript
// Screen number 107 = Contact Attachments
// File location: src/models/res_partner/screens/107_ContactAttachments.tsx
// Component name: ContactAttachments
// Screen type: attachments
```

#### **3. Common AI Tasks**

**Adding New Screen:**
```bash
# AI instruction: "Create screen 309 for lead kanban view"
# Creates: src/models/crm_lead/screens/309_LeadKanban.tsx
# Registers in: src/debug/ScreenRegistry.ts
```

**Modifying Existing Screen:**
```bash
# AI instruction: "Update screen 102 to add validation"
# Modifies: src/models/res_partner/screens/102_ContactDetail.tsx
```

**Adding New Model:**
```bash
# AI instruction: "Create product model with 700s range"
# Creates: src/models/product_product/ directory
# Assigns: screens 701-799 for product management
```

#### **4. Development Patterns**

**Screen Template:**
```typescript
/**
 * XXX_ScreenName - Brief description
 * Screen Number: XXX
 * Model: model.name
 * Type: list|detail|edit|create|bottomsheet|chatter|attachments|activities|custom
 */

import React from 'react';
import { SafeAreaView } from 'react-native';
import ScreenBadge from '../../../components/ScreenBadge';

export default function ScreenName() {
  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={XXX} />
      {/* Screen content */}
    </SafeAreaView>
  );
}
```

**Service Integration:**
```typescript
import { BaseModelService } from '../../base/services/BaseModelService';
import { Contact } from '../types/Contact';

export class ContactService extends BaseModelService<Contact> {
  constructor() {
    super('res.partner', DEFAULT_FIELDS, SEARCH_FIELDS);
  }
  
  // Model-specific methods
  async searchContacts(criteria: ContactSearchCriteria): Promise<Contact[]> {
    return this.searchRead(this.buildDomain(criteria));
  }
}
```

### 🛠️ **Base Components Usage Guide**

#### **BaseListView - Universal List Component**
```typescript
import BaseListView from '../../base/components/BaseListView';

<BaseListView
  data={items}                    // Array of records
  loading={loading}               // Loading state
  refreshing={refreshing}         // Pull-to-refresh state
  onRefresh={handleRefresh}       // Refresh handler
  renderItem={renderItem}         // Item renderer function
  headerTitle="Items"             // Header title
  searchQuery={searchQuery}       // Search text
  onSearchChange={handleSearch}   // Search handler
  filters={filters}               // Filter options
  activeFilter={activeFilter}     // Current filter
  onFilterChange={handleFilter}   // Filter handler
  showAddButton={true}            // Show add button
  onAddPress={handleAdd}          // Add button handler
  emptyStateIcon="inbox"          // Empty state icon
  emptyStateTitle="No items"      // Empty state title
  emptyStateSubtext="Add first"   // Empty state subtitle
/>
```

#### **BaseChatter - Universal Communication**
```typescript
import BaseChatter from '../../base/components/BaseChatter';

<BaseChatter
  modelName="res.partner"         // Odoo model name
  recordId={contactId}            // Record ID
  readonly={false}                // Edit permissions
  showTabs={true}                 // Show messages/activities tabs
  autoRefresh={30}                // Auto-refresh interval (seconds)
/>
```

#### **BaseModelService - Universal CRUD**
```typescript
// Extend for each model
export class YourModelService extends BaseModelService<YourModel> {
  constructor() {
    super('your.model', DEFAULT_FIELDS, SEARCH_FIELDS);
  }

  // Available methods:
  // - searchRead(domain, fields, options)
  // - read(id, fields)
  // - create(data)
  // - update(id, data)
  // - delete(id)
  // - search(query, limit)
  // - getLocalRecords(limit, offset)
}
```

## 🔄 Sync System Architecture

### **Offline-First Philosophy**
1. **Local-First**: Always try SQLite database first
2. **Background Sync**: Automatic synchronization when online
3. **Conflict Resolution**: Handle data conflicts intelligently
4. **Queue System**: Queue operations when offline
5. **Model Selection**: Choose which models to sync

### **Sync Management Screens (980s Series)**
```typescript
981 = SyncDashboard          // Main sync control center
982 = ModelSelection         // Choose models to sync
983 = CustomModelSelection   // Advanced model configuration  
984 = TemplateModelSelection // Predefined model sets
985 = SyncSettings           // Sync preferences & schedules
986 = SyncProgress           // Real-time sync monitoring
987 = ConflictResolution     // Handle data conflicts
988 = OfflineQueue           // Manage pending operations
989 = DatabaseManager        // SQLite data management
```

### **Sync Service Integration**
```typescript
// In any service extending BaseModelService
import { offlineQueueService } from '../../sync_management/services';

// Operations automatically queue when offline
await contactService.create(contactData);  // Queues if offline
await contactService.update(id, changes);  // Queues if offline
await contactService.delete(id);           // Queues if offline
```

## 🎨 UI/UX Development Guidelines

### **Design Patterns**
- **Material Design 3** color scheme and icons
- **Native iOS/Android** feel with platform-specific components
- **Dark/Light Mode** support (system preference)
- **Accessibility** with proper ARIA labels and color contrast
- **Responsive** design for tablets and phones

### **Component Hierarchy**
```typescript
1. App.tsx                    // Root component
2. AppStoreProvider           // Global state
3. AppNavigationProvider      // Navigation context
4. AllScreensStack           // Stack navigator
5. ScreenWrapper             // Screen container with bottom nav
6. [Specific Screen]         // Your screen component
7. ScreenBadge              // Development badge overlay
```

### **Styling Convention**
```typescript
// Use StyleSheet.create for all styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  // Follow Material Design spacing (4, 8, 12, 16, 24, 32)
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
});
```

## 🔧 Development Tools

### **Screen Badges for Development**
Every screen includes a development badge showing the screen number:
```typescript
import ScreenBadge from '../../../components/ScreenBadge';

<ScreenBadge 
  screenNumber={101} 
  position="top-right"      // top-left, top-right, bottom-left, bottom-right
  size="medium"             // small, medium, large
  showLabels={true}         // Show screen info
/>
```

### **Screen Registry for AI**
Complete mapping for AI development assistance:
```typescript
import { ScreenRegistryService } from '../debug/ScreenRegistry';

// Get screen information
const screen = ScreenRegistryService.getScreen(101);
// Returns screen metadata

// Get all screens for a model
const contactScreens = ScreenRegistryService.getScreensForModel('res.partner');

// Get next available screen number
const nextNumber = ScreenRegistryService.getNextScreenNumber('res.partner');

// Validate screen number
const isValid = ScreenRegistryService.isValidScreen(101);
```

### **Debug Information**
Enable development mode features:
```typescript
// In App.tsx - shows detailed error information
if (__DEV__) {
  // Development-only code
  console.log('🔧 Development mode enabled');
}
```

## 📋 Key Features Status

### ✅ **Completed Features**
- **Screen Numbering System**: Complete 3-digit numbering with registry
- **Base Architecture**: Universal components and services
- **Contact Management**: Full CRUD with screens 101-108
- **Sales Orders**: List and detail views (201-202)
- **Navigation System**: Stack + bottom tab with proper routing
- **Offline Sync**: SQLite database with queue system
- **Authentication**: Odoo XML-RPC login integration
- **State Management**: Zustand store with persistence
- **Development Tools**: Screen badges and registry
- **Field Service**: GPS and camera integration (801)
- **Settings**: Complete app configuration (901-907)
- **Sync Management**: Full offline sync system (981-989)

### 🚧 **In Progress**
- **Sales Order Management**: Complete 200s series screens
- **CRM Lead Management**: Complete 300s series screens
- **Employee Management**: Complete 400s series screens
- **Enhanced Filtering**: Advanced filter capabilities
- **Real-time Updates**: WebSocket integration
- **Performance Optimization**: Lazy loading and caching

### 🎯 **Planned Features**
- **Product Management**: 700s series screens
- **Project Management**: Enhanced project screens
- **Document Management**: Advanced file handling
- **Analytics Dashboard**: Business intelligence
- **Multi-language**: i18n internationalization
- **Push Notifications**: Real-time alerts

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Studio
- Odoo 18 server with XML-RPC access

### **Installation**
```bash
# Clone repository
git clone [repository-url]
cd expo-base1

# Install dependencies
npm install

# Configure Odoo connection
# Edit src/config/odoo.ts with your server details

# Start development server
npm start

# Run on specific platform
npm run ios     # iOS Simulator
npm run android # Android Emulator
npm run web     # Web browser
```

### **Configuration**
```typescript
// src/config/odoo.ts
export const ODOO_CONFIG = {
  url: 'https://your-odoo-server.com',
  database: 'your-database-name',
  timeout: 30000,
  debug: __DEV__,
};
```

## 🤝 AI Collaboration Guidelines

### **Best Practices for AI Development**
1. **Always use screen numbers** for precise references
2. **Follow naming conventions** strictly
3. **Extend base components** instead of creating from scratch
4. **Add screen badges** to new screens for debugging
5. **Update screen registry** when adding new screens
6. **Test offline functionality** for all CRUD operations
7. **Include TypeScript types** for all new interfaces
8. **Add error handling** for all async operations

### **Common AI Instructions Examples**
```bash
# Screen Development
"Create screen 309 for lead kanban view"
"Update screen 102 to add email validation"
"Fix the loading state on screen 201"

# Model Development  
"Add product model with 700s range"
"Implement full CRUD for projects model"
"Create custom search for contacts"

# Feature Development
"Add photo capture to screen 801"
"Implement push notifications"
"Add real-time sync progress"

# Bug Fixes
"Fix navigation issue from screen 105 to 102"
"Resolve SQLite connection error in sync"
"Update TypeScript types for Contact model"
```

---

## 📞 Support & Documentation

- **Screen Registry**: `src/debug/ScreenRegistry.ts` - Complete screen mapping
- **Base Components**: `src/models/base/components/` - Reusable UI components
- **Service Layer**: `src/models/base/services/` - Universal business logic
- **Type Definitions**: `src/models/*/types/` - Model-specific TypeScript types
- **Navigation Config**: `src/navigation/NavigationConfig.ts` - Navigation structure

**For AI Development**: This README provides complete instructions for any AI assistant to work effectively with this codebase. Always reference screen numbers and follow the established patterns for consistent development.