/**
 * Base Component Registry (BC-CXXX System)
 * 
 * Component Reference System from perfect-base-chatter.md
 * This registry tracks all BC-CXXX components for AI instructions and development
 */

// Base Component Reference Format: BC[Category][Number]
// BC = Base Component
// Category: L=List, F=Form, C=Chatter, K=Kanban, S=Search, etc.
// Number: Sequential within category

export const BASE_COMPONENT_REGISTRY = {
  // Chatter Components (C series)
  'BC-C001': 'BaseChatter',           // Main chatter component with AI integration
  'BC-C002': 'BaseChatInput',         // Message input with AI and voice
  'BC-C003': 'BaseMessageBubble',     // Individual message display (TODO)
  'BC-C004': 'BaseAttachmentViewer',  // Attachment handling with AI analysis (TODO)
  'BC-C005': 'BaseActivityTracker',   // Activities component (TODO)
  'BC-C006': 'BaseFollowersList',     // Followers management (TODO)
  'BC-C007': 'BaseChatterAI',         // AI assistant integration
  
  // List Components (L series)
  'BC-L001': 'BaseListView',          // ✅ Main list component - IMPLEMENTED
  'BC-L002': 'BaseListHeader',        // List header with actions (TODO)
  'BC-L003': 'BaseListItem',          // Individual list item (TODO)
  'BC-L004': 'BaseListFilters',       // Filtering component (TODO)

  // Form Components (F series)
  'BC-F001': 'BaseFormView',          // ✅ Main form component - IMPLEMENTED
  'BC-F002': 'BaseFormField',         // Individual form field (TODO)
  'BC-F003': 'BaseFormActions',       // Form action buttons (TODO)
  'BC-F004': 'BaseFormValidation',    // Validation component (TODO)

  // Sheet Components (S series)
  'BC-S001': 'BaseBottomSheet',       // ✅ Bottom sheet component - IMPLEMENTED
  'BC-S002': 'BaseFilterSheet',       // ✅ Filter bottom sheet - IMPLEMENTED
  'BC-S003': 'BaseActionSheet',       // Action sheet (TODO)
  
  // Workflow Components (W series)
  'BC-W001': 'BaseWorkflowActions',   // ✅ Workflow actions - IMPLEMENTED
  'BC-W002': 'BaseWorkflowSteps',     // Workflow steps (TODO)
  'BC-W003': 'BaseWorkflowProgress',  // Workflow progress (TODO)

  // Business Intelligence Components (B series)
  'BC-B001': 'BusinessIntelligence',  // ✅ Business intelligence - IMPLEMENTED
  'BC-B002': 'BaseCharts',            // Charts component (TODO)
  'BC-B003': 'BaseMetrics',           // Metrics component (TODO)

  // Universal Components (U series)
  'BC-U001': 'UniversalSearch',       // ✅ Universal search - IMPLEMENTED
  'BC-U002': 'UniversalFilter',       // Universal filter (TODO)
  'BC-U003': 'UniversalExport',       // Universal export (TODO)

  // Real-time Components (R series)
  'BC-R001': 'BaseRealtimeChatter',   // Real-time chatter integration
  'BC-R002': 'BaseWebSocketManager',  // WebSocket management service
  'BC-R003': 'BaseTypingIndicators',  // Typing indicators (TODO)
  'BC-R004': 'BasePresenceTracker',   // User presence tracking (TODO)
} as const;

// AI Instructions for Base Components
export const BASE_COMPONENT_AI_INSTRUCTIONS = {
  'BC-C001': {
    component: 'BaseChatter',
    filePath: 'src/models/base/components/BC-C001_BaseChatter.tsx',
    description: 'Main chatter component with AI integration and real-time features',
    instructions: [
      'Edit the main chatter component with AI integration',
      'Add real-time messaging capabilities',
      'Enhance with voice message support',
      'Integrate Groq AI for smart replies and summaries'
    ],
    commonTasks: [
      'Add new message types',
      'Enhance AI integration',
      'Improve real-time updates',
      'Add multimedia support',
      'Integrate with BC-C002 and BC-C007'
    ],
    dependencies: ['BC-C002', 'BC-C007'],
    features: [
      'Tabbed interface (messages, activities, attachments, followers)',
      'AI assistant integration',
      'Real-time typing indicators',
      'Message reactions and replies',
      'HTML message rendering'
    ]
  },
  
  'BC-C002': {
    component: 'BaseChatInput',
    filePath: 'src/models/base/components/BC-C002_BaseChatInput.tsx',
    description: 'AI-powered chat input with voice and document scanning',
    instructions: [
      'Edit the chat input component for better UX',
      'Add AI-powered auto-completion',
      'Integrate voice-to-text functionality',
      'Add smart emoji and mention suggestions'
    ],
    commonTasks: [
      'Enhance AI completion features',
      'Improve voice input capabilities',
      'Add document scanning integration',
      'Enhance attachment handling',
      'Add smart reply suggestions'
    ],
    dependencies: ['BC-C007'],
    features: [
      'AI-powered auto-completion',
      'Voice-to-text with Groq Whisper',
      'Document scanning with OCR',
      'Smart mentions and emoji suggestions',
      'Real-time typing indicators',
      'Attachment handling'
    ]
  },
  
  'BC-C007': {
    component: 'BaseChatterAI',
    filePath: 'src/models/base/components/BC-C007_BaseChatterAI.tsx',
    description: 'AI assistant integration for chatter system',
    instructions: [
      'Edit the AI integration component',
      'Add new Groq AI models',
      'Enhance AI suggestion algorithms',
      'Add new AI analysis features'
    ],
    commonTasks: [
      'Add new Groq AI models',
      'Enhance AI suggestion algorithms',
      'Add new AI analysis features',
      'Improve AI response generation',
      'Add new AI interaction modes'
    ],
    dependencies: [],
    features: [
      'Smart reply generation',
      'Conversation summarization',
      'Context analysis and insights',
      'Action suggestions',
      'Sentiment analysis',
      'Document analysis integration'
    ]
  },
  
  'BC-L001': {
    component: 'BaseListView',
    filePath: 'src/models/base/components/BaseListView.tsx',
    description: 'Universal list component with search and filtering',
    instructions: [
      'Edit the main list component',
      'Add new list layouts and styles',
      'Enhance search and filtering',
      'Add AI-powered list insights'
    ],
    commonTasks: [
      'Add new list item layouts',
      'Enhance search functionality',
      'Improve filtering options',
      'Add infinite scrolling',
      'Integrate AI suggestions'
    ],
    dependencies: ['BC-S002'],
    features: [
      'Multiple layout options',
      'Built-in search and filtering',
      'Pull-to-refresh',
      'Empty state handling',
      'Infinite scrolling support'
    ]
  },
  
  'BC-F001': {
    component: 'BaseFormView',
    filePath: 'src/models/base/components/BaseFormView.tsx',
    description: 'Universal form component with validation and HTML rendering',
    instructions: [
      'Edit the main form component',
      'Add new field types',
      'Enhance validation system',
      'Add AI-powered form assistance'
    ],
    commonTasks: [
      'Add new form field types',
      'Enhance validation rules',
      'Improve HTML rendering',
      'Add form auto-completion',
      'Integrate AI form assistance'
    ],
    dependencies: [],
    features: [
      'Multiple field types',
      'HTML content rendering',
      'Form validation',
      'Auto-save functionality',
      'Responsive layouts'
    ]
  },
  
  'BC-S001': {
    component: 'BaseBottomSheet',
    filePath: 'src/models/base/components/BaseBottomSheet.tsx',
    description: 'Universal bottom sheet component for actions and content',
    instructions: [
      'Edit the bottom sheet component',
      'Add new sheet layouts',
      'Enhance gesture handling',
      'Add AI-powered sheet content'
    ],
    commonTasks: [
      'Add new sheet layouts',
      'Enhance gesture handling',
      'Improve animation performance',
      'Add custom sheet content',
      'Integrate AI suggestions'
    ],
    dependencies: [],
    features: [
      'Gesture-based interactions',
      'Multiple snap points',
      'Custom content support',
      'Action button layouts',
      'Smooth animations'
    ]
  },

  'BC-R001': {
    component: 'BaseRealtimeChatter',
    filePath: 'src/models/base/components/BC-R001_BaseRealtimeChatter.tsx',
    description: 'Real-time integration for chatter system with existing WebSocket infrastructure',
    instructions: [
      'Edit the real-time chatter component',
      'Enhance WebSocket integration',
      'Add new real-time features',
      'Improve typing indicators and presence'
    ],
    commonTasks: [
      'Add new real-time message types',
      'Enhance typing indicator UX',
      'Improve presence status display',
      'Add live reactions and status',
      'Integrate with BC-C001 and BC-R002'
    ],
    dependencies: ['BC-C001', 'BC-R002'],
    features: [
      'Real-time message delivery',
      'Typing indicators with user presence',
      'Live reactions and message status',
      'WebSocket integration with existing services',
      'Seamless fallback to polling',
      'Maintains all BC-C001 features'
    ]
  },

  'BC-R002': {
    component: 'BaseWebSocketManager',
    filePath: 'src/models/base/services/BC-R002_BaseWebSocketManager.ts',
    description: 'Unified WebSocket management service organizing existing infrastructure',
    instructions: [
      'Edit the WebSocket manager service',
      'Add new connection management features',
      'Enhance error handling and recovery',
      'Add new real-time capabilities'
    ],
    commonTasks: [
      'Add new WebSocket event types',
      'Enhance connection reliability',
      'Improve message queue management',
      'Add new subscription patterns',
      'Integrate with existing Odoo WebSocket services'
    ],
    dependencies: [],
    features: [
      'Unified interface for existing WebSocket services',
      'Connection lifecycle management',
      'Channel subscription management',
      'Message queue and retry logic',
      'Metrics and monitoring',
      'Auto-reconnection with backoff'
    ]
  }
};

// Usage Examples for AI
export const CHATTER_USAGE_EXAMPLES = [
  "Edit BC-C001 to add emoji reactions to messages",
  "Update BC-C002 with better voice transcription using Groq Whisper",
  "Enhance BC-C007 with document summarization using Groq Vision",
  "Add translation feature to BC-C003 message bubbles",
  "Integrate sentiment analysis in BC-C001 for customer service insights",
  "Improve BC-L001 with AI-powered search suggestions",
  "Add smart form completion to BC-F001 using AI",
  "Enhance BC-S001 with AI-suggested actions"
];

// AI Development Workflow
export const AI_DEVELOPMENT_WORKFLOW = {
  1: "Identify component: Use BC-CXXX reference",
  2: "Understand context: Review component purpose and current features", 
  3: "Plan enhancement: Consider AI integration points",
  4: "Implement changes: Follow established patterns",
  5: "Test integration: Ensure Groq AI works correctly",
  6: "Update references: Add new features to component registry"
};

// Component Status Tracking
export const COMPONENT_STATUS = {
  'BC-C001': 'implemented',     // BaseChatter - Enhanced version created
  'BC-C002': 'implemented',     // BaseChatInput - AI-powered version created
  'BC-C003': 'implemented',     // BaseMessageBubble - Message display created
  'BC-C004': 'implemented',     // BaseAttachmentViewer - Attachment handling created
  'BC-C005': 'implemented',     // BaseActivityTracker - Activity management created
  'BC-C006': 'implemented',     // BaseFollowersList - Followers management created
  'BC-C007': 'implemented',     // BaseChatterAI - AI integration created
  'BC-L001': 'existing',        // BaseListView - Already exists
  'BC-F001': 'existing',        // BaseFormView - Already exists
  'BC-S001': 'existing',        // BaseBottomSheet - Already exists
  'BC-S002': 'existing',        // BaseFilterSheet - Already exists
  'BC-W001': 'existing',        // BaseWorkflowActions - Already exists
  'BC-L002': 'todo',           // BaseListHeader - To be created
  'BC-L003': 'todo',           // BaseListItem - To be created
  'BC-L004': 'todo',           // BaseListFilters - To be created
  'BC-F002': 'todo',           // BaseFormField - To be created
  'BC-F003': 'todo',           // BaseFormActions - To be created
  'BC-F004': 'todo',           // BaseFormValidation - To be created
  'BC-R001': 'implemented',    // BaseRealtimeChatter - Real-time integration created
  'BC-R002': 'implemented',    // BaseWebSocketManager - WebSocket manager created
  'BC-R003': 'todo',           // BaseTypingIndicators - To be created
  'BC-R004': 'todo',           // BasePresenceTracker - To be created
};

// Helper function to get component info
export function getComponentInfo(componentRef: string) {
  return BASE_COMPONENT_AI_INSTRUCTIONS[componentRef as keyof typeof BASE_COMPONENT_AI_INSTRUCTIONS];
}

// Helper function to get component status
export function getComponentStatus(componentRef: string) {
  return COMPONENT_STATUS[componentRef as keyof typeof COMPONENT_STATUS];
}

// Helper function to get all components by category
export function getComponentsByCategory(category: string) {
  return Object.entries(BASE_COMPONENT_REGISTRY)
    .filter(([ref]) => ref.includes(`-${category.toUpperCase()}`))
    .map(([ref, name]) => ({ ref, name, status: getComponentStatus(ref) }));
}

// Export types for TypeScript
export type ComponentRef = keyof typeof BASE_COMPONENT_REGISTRY;
export type ComponentStatus = 'implemented' | 'existing' | 'todo' | 'deprecated';
export type ComponentCategory = 'C' | 'L' | 'F' | 'S' | 'W';

// AI Instruction Templates
export const AI_INSTRUCTION_TEMPLATES = {
  editComponent: (ref: ComponentRef) => 
    `Edit ${ref} (${BASE_COMPONENT_REGISTRY[ref]}) to enhance its functionality`,
  
  addFeature: (ref: ComponentRef, feature: string) => 
    `Add ${feature} feature to ${ref} (${BASE_COMPONENT_REGISTRY[ref]})`,
  
  integrateAI: (ref: ComponentRef) => 
    `Integrate AI capabilities into ${ref} (${BASE_COMPONENT_REGISTRY[ref]})`,
  
  improvePerformance: (ref: ComponentRef) => 
    `Improve performance and optimization of ${ref} (${BASE_COMPONENT_REGISTRY[ref]})`
};

export default BASE_COMPONENT_REGISTRY;
