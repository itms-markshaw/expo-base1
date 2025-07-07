# BottomSheet Naming Standards & Enhanced Badge System

## 🎯 **Current Analysis**

After reviewing your implementations, I see excellent patterns but some inconsistencies. Here's how to standardize and enhance the system.

---

## 📋 **BottomSheet Naming Conventions**

### **Current Issues Identified:**
- **Mixed locations**: Some in `/screens/` (105, 205), others in `/components/`
- **Inconsistent naming**: `ContactBottomSheet` vs `SalesOrderDetailBottomSheet`
- **Different patterns**: Screen-numbered vs component-style
- **Varied functionality**: Quick actions vs detailed views

### **🎯 Recommended Naming Standards**

#### **1. Screen BottomSheets (X05 series) - Quick Actions**
```typescript
// Pattern: XXX_[ModelName]BottomSheet.tsx
// Location: src/models/[model]/screens/

105_ContactBottomSheet.tsx          ✅ CORRECT
205_SalesOrderBottomSheet.tsx       ✅ CORRECT  
305_LeadBottomSheet.tsx            // New - CRM leads
405_EmployeeBottomSheet.tsx        // New - HR employees
505_ActivityBottomSheet.tsx        // New - Activities
605_TicketBottomSheet.tsx          // New - Helpdesk tickets
705_EventBottomSheet.tsx           // New - Calendar events
805_ProjectBottomSheet.tsx         // New - Projects
```

#### **2. Component BottomSheets - Specialized Views**
```typescript
// Pattern: [ModelName][Purpose]BottomSheet.tsx
// Location: src/models/[model]/components/

// Detail views (complex data display)
ContactDetailBottomSheet.tsx
SalesOrderDetailBottomSheet.tsx    ✅ CURRENT
EmployeeDetailBottomSheet.tsx      ✅ CURRENT
TicketDetailBottomSheet.tsx

// Filter views
ContactFilterBottomSheet.tsx
HelpdeskFilterBottomSheet.tsx      ✅ CURRENT
SalesOrderFilterBottomSheet.tsx

// Workflow views
SalesOrderWorkflowBottomSheet.tsx
HelpdeskWorkflowBottomSheet.tsx    ✅ CURRENT
LeadWorkflowBottomSheet.tsx

// Specialized functions
SavedFiltersBottomSheet.tsx        ✅ CURRENT
BulkActionsBottomSheet.tsx
DocumentScanBottomSheet.tsx
```

---

## 🎨 **Enhanced Badge System**

### **Current Limitation:**
- Only shows screen numbers
- Single blue color
- No component/service identification

### **🚀 New Multi-Badge System**

#### **Badge Categories & Colors**
```typescript
export enum BadgeType {
  SCREEN = 'screen',           // Blue - Screen number
  COMPONENT = 'component',     // Green - Base component reference  
  SERVICE = 'service',         // Orange - Service integration
  AI = 'ai',                   // Purple - AI features
  REALTIME = 'realtime',       // Red - Real-time features
  OFFLINE = 'offline',         // Gray - Offline capability
}

export const BADGE_COLORS = {
  [BadgeType.SCREEN]: '#007AFF',      // Blue
  [BadgeType.COMPONENT]: '#34C759',   // Green  
  [BadgeType.SERVICE]: '#FF9500',     // Orange
  [BadgeType.AI]: '#9C27B0',          // Purple
  [BadgeType.REALTIME]: '#FF3B30',    // Red
  [BadgeType.OFFLINE]: '#8E8E93',     // Gray
};
```

#### **Enhanced ScreenBadge Component**
```typescript
// src/components/ScreenBadge.tsx (Enhanced)
export interface ScreenBadgeProps {
  screenNumber?: number;
  components?: string[];       // ['BC-C001', 'BC-L001']
  services?: string[];         // ['ContactService', 'ChatterService']
  aiFeatures?: string[];       // ['groq-chat', 'voice-transcription']
  realTimeFeatures?: string[]; // ['websocket', 'presence']
  offlineCapable?: boolean;
  position?: BadgePosition;
  layout?: 'stack' | 'grid' | 'minimal';
  showLabels?: boolean;
}

export default function ScreenBadge({
  screenNumber,
  components = [],
  services = [],
  aiFeatures = [],
  realTimeFeatures = [],
  offlineCapable = false,
  position = 'top-right',
  layout = 'stack',
  showLabels = false
}: ScreenBadgeProps) {
  const { showScreenBadges } = useAppStore();

  if (!showScreenBadges) return null;

  const badges = [];

  // Screen number badge (always first)
  if (screenNumber) {
    badges.push({
      type: BadgeType.SCREEN,
      value: screenNumber.toString(),
      label: 'Screen'
    });
  }

  // Component badges
  components.forEach(comp => {
    badges.push({
      type: BadgeType.COMPONENT,
      value: comp.replace('BC-', ''),
      label: comp
    });
  });

  // Service badges
  services.forEach(service => {
    badges.push({
      type: BadgeType.SERVICE,
      value: service.charAt(0).toUpperCase(),
      label: service
    });
  });

  // AI feature badges
  if (aiFeatures.length > 0) {
    badges.push({
      type: BadgeType.AI,
      value: 'AI',
      label: `AI: ${aiFeatures.join(', ')}`
    });
  }

  // Real-time badges
  if (realTimeFeatures.length > 0) {
    badges.push({
      type: BadgeType.REALTIME,
      value: '⚡',
      label: `Real-time: ${realTimeFeatures.join(', ')}`
    });
  }

  // Offline badge
  if (offlineCapable) {
    badges.push({
      type: BadgeType.OFFLINE,
      value: '📱',
      label: 'Offline capable'
    });
  }

  return (
    <View style={[styles.badgeContainer, getPositionStyle(position)]}>
      {layout === 'stack' && renderStackLayout(badges)}
      {layout === 'grid' && renderGridLayout(badges)}
      {layout === 'minimal' && renderMinimalLayout(badges)}
    </View>
  );
}
```

#### **Usage Examples**
```typescript
// 1. Simple screen badge (current behavior)
<ScreenBadge screenNumber={101} />

// 2. Full feature showcase
<ScreenBadge 
  screenNumber={101}
  components={['BC-C001', 'BC-L001']}
  services={['ContactService', 'ChatterService']}
  aiFeatures={['smart-replies', 'voice-commands']}
  realTimeFeatures={['websocket', 'typing-indicators']}
  offlineCapable={true}
  layout="grid"
  showLabels={true}
/>

// 3. Component-focused (for base components)
<ScreenBadge 
  components={['BC-C001']}
  services={['BaseChatterService']}
  aiFeatures={['groq-integration']}
  layout="minimal"
/>

// 4. Service highlighting
<ScreenBadge 
  screenNumber={205}
  services={['SalesOrderService', 'WorkflowService']}
  aiFeatures={['document-analysis']}
  offlineCapable={true}
/>
```

---

## 🔧 **Implementation Guide**

### **1. Standardize Existing BottomSheets**

#### **Move to Correct Locations**
```bash
# Current inconsistencies to fix:
mv src/models/sale_order/components/SalesOrderDetailBottomSheet.tsx \
   src/models/sale_order/components/SalesOrderDetailBottomSheet.tsx ✅ KEEP

mv src/models/hr_employee/components/EmployeeDetailBottomSheet.tsx \
   src/models/hr_employee/components/EmployeeDetailBottomSheet.tsx ✅ KEEP
```

#### **Create Missing Screen BottomSheets (X05 series)**
```typescript
// Need to create these:
src/models/crm_lead/screens/305_LeadBottomSheet.tsx
src/models/hr_employee/screens/405_EmployeeBottomSheet.tsx
src/models/mail_activity/screens/505_ActivityBottomSheet.tsx
src/models/helpdesk_ticket/screens/605_TicketBottomSheet.tsx
src/models/calendar_event/screens/705_EventBottomSheet.tsx
src/models/project_project/screens/805_ProjectBottomSheet.tsx
```

### **2. Template for New BottomSheets**

#### **Screen BottomSheet Template (X05)**
```typescript
// Template: XXX_[Model]BottomSheet.tsx
/**
 * XXX_[Model]BottomSheet - [Model] quick actions bottom sheet
 * Screen Number: XXX
 * Model: [model.name]
 * Type: bottomsheet
 */

import React from 'react';
import BaseBottomSheet from '../../base/components/BaseBottomSheet';
import ScreenBadge from '../../../components/ScreenBadge';
import { [Model] } from '../types/[Model]';

interface [Model]BottomSheetProps {
  [model]: [Model];
  visible: boolean;
  onClose: () => void;
  // Standard actions
  onEdit?: ([model]: [Model]) => void;
  onDelete?: ([model]: [Model]) => void;
  onChatter?: ([model]: [Model]) => void;
  onActivities?: ([model]: [Model]) => void;
  onAttachments?: ([model]: [Model]) => void;
  // Model-specific actions
  onCustomAction?: ([model]: [Model]) => void;
}

export default function [Model]BottomSheet({
  [model],
  visible,
  onClose,
  onEdit,
  onDelete,
  onChatter,
  onActivities,
  onAttachments,
  onCustomAction
}: [Model]BottomSheetProps) {

  const get[Model]Actions = (): BottomSheetAction<[Model]>[] => {
    // Define model-specific actions
    return [
      // Communication actions
      {
        id: 'chatter',
        label: 'Chatter',
        icon: 'message',
        color: '#007AFF',
        onPress: ([model]) => onChatter?.([model])
      },
      // Management actions  
      {
        id: 'edit',
        label: 'Edit',
        icon: 'edit', 
        color: '#007AFF',
        onPress: ([model]) => onEdit?.([model])
      }
      // Add model-specific actions
    ];
  };

  return (
    <BaseBottomSheet
      record={[model]}
      visible={visible}
      onClose={onClose}
      actions={get[Model]Actions()}
      title={[model].name}
      subtitle="[Model description]"
      snapPoints={['30%', '60%', '90%']}
    >
      {/* Model-specific content */}
      
      <ScreenBadge 
        screenNumber={XXX}
        components={['BC-B001']} // Base BottomSheet
        services={['[Model]Service']}
        offlineCapable={true}
      />
    </BaseBottomSheet>
  );
}
```

#### **Component BottomSheet Template**
```typescript
// Template: [Model][Purpose]BottomSheet.tsx
/**
 * [Model][Purpose]BottomSheet - [Purpose] for [model]
 * Component Reference: BC-B002 (if base) or [Model]-B-[Purpose]
 */

import React, { useRef, useMemo } from 'react';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import ScreenBadge from '../../../components/ScreenBadge';

interface [Model][Purpose]BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  [model]: [Model];
  // Purpose-specific props
}

export default function [Model][Purpose]BottomSheet({
  visible,
  onClose,
  [model]
}: [Model][Purpose]BottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '70%', '95%'], []);

  // Purpose-specific implementation

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={(index) => index === -1 && onClose()}
      enablePanDownToClose={true}
    >
      {/* Purpose-specific content */}
      
      <ScreenBadge 
        components={['BC-B002']} // Or specific component reference
        services={['[Model]Service', '[Purpose]Service']}
        // Add relevant badges
      />
    </BottomSheet>
  );
}
```

---

## 🎯 **Badge System Integration**

### **Automatic Badge Detection**
```typescript
// src/utils/BadgeDetector.ts
export class BadgeDetector {
  static detectScreenFeatures(screenNumber: number): ScreenBadgeProps {
    const screenInfo = SCREEN_REGISTRY[screenNumber];
    if (!screenInfo) return {};

    return {
      screenNumber,
      components: this.detectComponents(screenNumber),
      services: this.detectServices(screenInfo.model),
      aiFeatures: this.detectAIFeatures(screenNumber),
      realTimeFeatures: this.detectRealTimeFeatures(screenNumber),
      offlineCapable: this.isOfflineCapable(screenInfo.model)
    };
  }

  private static detectComponents(screenNumber: number): string[] {
    // Logic to detect which base components are used
    const components = [];
    
    if (this.hasChatter(screenNumber)) components.push('BC-C001');
    if (this.hasList(screenNumber)) components.push('BC-L001');
    if (this.hasForm(screenNumber)) components.push('BC-F001');
    if (this.hasBottomSheet(screenNumber)) components.push('BC-B001');
    
    return components;
  }

  private static detectServices(modelName: string): string[] {
    // Detect which services are used
    const services = [`${modelName.split('.')[1]}Service`];
    if (this.hasChatter(screenNumber)) services.push('ChatterService');
    if (this.hasSync(modelName)) services.push('SyncService');
    return services;
  }
}
```

### **Smart Badge Usage**
```typescript
// Auto-detect and display relevant badges
const ContactsList = () => {
  const badges = BadgeDetector.detectScreenFeatures(101);
  
  return (
    <SafeAreaView style={styles.container}>
      <BaseListView {...props} />
      <ScreenBadge {...badges} />
    </SafeAreaView>
  );
};
```

---

## 📱 **Visual Badge Layouts**

### **1. Stack Layout (Default)**
```
┌─────┐
│ 101 │ ← Screen number (blue)
├─────┤  
│ C01 │ ← Component (green)
├─────┤
│  S  │ ← Service (orange)
├─────┤
│ AI  │ ← AI features (purple)
└─────┘
```

### **2. Grid Layout (Compact)**
```
┌─────┬─────┐
│ 101 │ C01 │ ← Screen + Component
├─────┼─────┤
│  S  │ AI  │ ← Service + AI
└─────┴─────┘
```

### **3. Minimal Layout (Single)**
```
┌─────┐
│ 101 │ ← Primary badge only
└─────┘
  +3    ← Indicator for additional features
```

---

## 🎯 **Development Workflow**

### **For AI Instructions**
```typescript
// Clear component references for AI
"Edit BC-B001 to add new quick action"          // Base BottomSheet
"Update 105_ContactBottomSheet with calling"    // Screen BottomSheet  
"Enhance ContactDetailBottomSheet with AI"      // Component BottomSheet
"Add badges to show BottomSheet components"     // Badge system
```

### **Badge Configuration Examples**
```typescript
// Different screen types get different badge configs

// List screens (X01)
<ScreenBadge 
  screenNumber={101}
  components={['BC-L001']}
  services={['ContactService']}
  offlineCapable={true}
/>

// Detail screens (X02)  
<ScreenBadge 
  screenNumber={102}
  components={['BC-F001', 'BC-C001']}
  services={['ContactService', 'ChatterService']}
  aiFeatures={['smart-completion']}
  realTimeFeatures={['live-updates']}
/>

// BottomSheet screens (X05)
<ScreenBadge 
  screenNumber={105}
  components={['BC-B001']}
  services={['ContactService']}
  layout="minimal"
/>
```

---

## 🏆 **Benefits of This System**

### **✅ Consistent Naming**
- Clear distinction between screen vs component BottomSheets
- Predictable file locations
- Easy AI instruction targeting

### **✅ Enhanced Development Experience**
- Visual feedback on component/service usage
- Quick identification of features
- Better debugging and development

### **✅ Future-Proof Architecture**
- Extensible badge system
- Auto-detection capabilities
- Clear patterns for new BottomSheets

This system provides **crystal-clear organization** for your BottomSheets while giving developers **visual feedback** about the components and services active on each screen!