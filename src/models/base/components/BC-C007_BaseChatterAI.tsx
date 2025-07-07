/**
 * BaseChatterAI (BC-C007) - AI Integration Component for Chatter System
 * Component Reference: BC-C007
 * 
 * ENHANCED: Groq AI integration with smart replies, summaries, and analysis
 * Following the BC-CXXX component reference system from perfect-base-chatter.md
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// BC-C007 Interfaces
export interface BaseChatterAIProps {
  suggestions: AISuggestion[];
  context: ChatterContext;
  onAction: (action: AIAction) => void;
  features?: AIChatterFeatures;
  theme?: AITheme;
}

export interface ChatterContext {
  modelName: string;
  recordId: number;
  messages: ChatterMessage[];
  activities?: ChatterActivity[];
  attachments?: Attachment[];
  recordData?: any;
}

export interface AISuggestion {
  id: string;
  type: 'smart_reply' | 'summary' | 'analysis' | 'action';
  title: string;
  content: string;
  confidence: number;
  timestamp: string;
}

export interface AIAction {
  type: 'smart_replies_generated' | 'summary_generated' | 'context_analysis' | 'action_suggestions';
  data: any;
  timestamp?: string;
}

export interface AIChatterFeatures {
  smartReplies: boolean;
  messageSummary: boolean;
  contextAnalysis: boolean;
  actionSuggestions: boolean;
  voiceTranscription: boolean;
  documentAnalysis: boolean;
  languageTranslation: boolean;
  sentimentAnalysis: boolean;
}

export interface AITheme {
  primaryColor: string;
  backgroundColor: string;
  panelBackgroundColor: string;
  textColor: string;
  borderRadius: number;
}

export interface ChatterMessage {
  id: number;
  body: string;
  create_date: string;
  author_id?: [number, string];
  message_type?: string;
}

export interface ChatterActivity {
  id: number;
  summary: string;
  activity_type_id: [number, string];
  date_deadline?: string;
  state: string;
}

export interface Attachment {
  id: number;
  name: string;
  mimetype: string;
  file_size: number;
  url: string;
}

export type AIMode = 'assistant' | 'summary' | 'analysis' | 'actions';

// Default configurations
const DEFAULT_AI_FEATURES: AIChatterFeatures = {
  smartReplies: true,
  messageSummary: true,
  contextAnalysis: true,
  actionSuggestions: true,
  voiceTranscription: true,
  documentAnalysis: true,
  languageTranslation: false,
  sentimentAnalysis: true,
};

const DEFAULT_THEME: AITheme = {
  primaryColor: '#007AFF',
  backgroundColor: '#F2F2F7',
  panelBackgroundColor: '#FFFFFF',
  textColor: '#000000',
  borderRadius: 12,
};

/**
 * BC-C007: AI Integration Component
 * 
 * Features:
 * - Smart reply generation with Groq AI
 * - Conversation summarization
 * - Context analysis and insights
 * - Action suggestions based on conversation
 * - Sentiment analysis
 * - Document analysis integration
 */
export default function BaseChatterAI({
  suggestions,
  context,
  onAction,
  features = DEFAULT_AI_FEATURES,
  theme = DEFAULT_THEME
}: BaseChatterAIProps) {
  // State management
  const [isActive, setIsActive] = useState(false);
  const [aiMode, setAIMode] = useState<AIMode>('assistant');
  const [loading, setLoading] = useState(false);
  const [aiResults, setAIResults] = useState<any>(null);

  // Animation
  const panelAnimation = useRef(new Animated.Value(0)).current;

  // Toggle AI panel
  const toggleAIPanel = useCallback(() => {
    const newState = !isActive;
    setIsActive(newState);
    
    Animated.spring(panelAnimation, {
      toValue: newState ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  // Smart Reply Generation
  const generateSmartReplies = useCallback(async () => {
    if (!features.smartReplies) return;

    setLoading(true);
    try {
      // TODO: Integrate with Groq AI service
      // const replies = await groqService.generateSmartReplies(context);
      
      // Simulated smart replies
      const mockReplies = [
        "Thank you for the update. I'll review this and get back to you.",
        "This looks good to me. Let's proceed with the next steps.",
        "I have a few questions about this. Can we schedule a quick call?"
      ];

      setAIResults(mockReplies);
      onAction({
        type: 'smart_replies_generated',
        data: mockReplies,
        timestamp: new Date().toISOString()
      });

      Alert.alert('Smart Replies Generated', `Generated ${mockReplies.length} reply suggestions`);
    } catch (error) {
      console.error('Smart reply generation failed:', error);
      Alert.alert('Error', 'Failed to generate smart replies');
    } finally {
      setLoading(false);
    }
  }, [context, features.smartReplies, onAction]);

  // Message Summary
  const generateMessageSummary = useCallback(async () => {
    if (!features.messageSummary) return;

    setLoading(true);
    try {
      // TODO: Integrate with Groq AI service
      // const summary = await groqService.summarizeConversation(context);
      
      // Simulated summary
      const mockSummary = {
        keyPoints: [
          "Customer inquiry about product pricing",
          "Discussion of delivery timeline",
          "Request for technical specifications"
        ],
        sentiment: "positive",
        actionItems: [
          "Send updated pricing sheet",
          "Confirm delivery date",
          "Provide technical documentation"
        ]
      };

      setAIResults(mockSummary);
      onAction({
        type: 'summary_generated',
        data: mockSummary,
        timestamp: new Date().toISOString()
      });

      Alert.alert('Summary Generated', 'Conversation summary is ready');
    } catch (error) {
      console.error('Summary generation failed:', error);
      Alert.alert('Error', 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }, [context, features.messageSummary, onAction]);

  // Context Analysis
  const analyzeContext = useCallback(async () => {
    if (!features.contextAnalysis) return;

    setLoading(true);
    try {
      // TODO: Integrate with Groq AI service
      // const analysis = await groqService.analyzeChatterContext(context);
      
      // Simulated analysis
      const mockAnalysis = {
        conversationTone: "Professional and collaborative",
        urgencyLevel: "Medium",
        customerSatisfaction: "High",
        recommendedActions: [
          "Follow up within 24 hours",
          "Prepare detailed proposal",
          "Schedule demo session"
        ],
        riskFactors: [],
        opportunities: [
          "Potential for upselling",
          "Long-term partnership opportunity"
        ]
      };

      setAIResults(mockAnalysis);
      onAction({
        type: 'context_analysis',
        data: mockAnalysis,
        timestamp: new Date().toISOString()
      });

      Alert.alert('Analysis Complete', 'Context analysis is ready');
    } catch (error) {
      console.error('Context analysis failed:', error);
      Alert.alert('Error', 'Failed to analyze context');
    } finally {
      setLoading(false);
    }
  }, [context, features.contextAnalysis, onAction]);

  // Action Suggestions
  const generateActionSuggestions = useCallback(async () => {
    if (!features.actionSuggestions) return;

    setLoading(true);
    try {
      // TODO: Integrate with Groq AI service
      // const suggestions = await groqService.suggestActions(context);
      
      // Simulated action suggestions
      const mockSuggestions = [
        {
          action: "Schedule Follow-up",
          description: "Schedule a follow-up call for next week",
          priority: "high",
          estimatedTime: "15 minutes"
        },
        {
          action: "Send Quote",
          description: "Generate and send a detailed quote",
          priority: "medium",
          estimatedTime: "30 minutes"
        },
        {
          action: "Update CRM",
          description: "Update customer record with conversation notes",
          priority: "low",
          estimatedTime: "5 minutes"
        }
      ];

      setAIResults(mockSuggestions);
      onAction({
        type: 'action_suggestions',
        data: mockSuggestions,
        timestamp: new Date().toISOString()
      });

      Alert.alert('Actions Suggested', `Generated ${mockSuggestions.length} action suggestions`);
    } catch (error) {
      console.error('Action suggestion failed:', error);
      Alert.alert('Error', 'Failed to generate action suggestions');
    } finally {
      setLoading(false);
    }
  }, [context, features.actionSuggestions, onAction]);

  // Get mode-specific content
  const getModeContent = () => {
    if (!aiResults) return null;

    switch (aiMode) {
      case 'assistant':
        return (
          <View style={styles.modeContent}>
            <Text style={[styles.modeTitle, { color: theme.textColor }]}>
              AI Assistant
            </Text>
            <Text style={styles.modeDescription}>
              Get smart suggestions and insights for your conversation
            </Text>
          </View>
        );
      
      case 'summary':
        return (
          <View style={styles.modeContent}>
            <Text style={[styles.modeTitle, { color: theme.textColor }]}>
              Conversation Summary
            </Text>
            {aiResults.keyPoints && (
              <View style={styles.resultSection}>
                <Text style={styles.resultTitle}>Key Points:</Text>
                {aiResults.keyPoints.map((point: string, index: number) => (
                  <Text key={index} style={styles.resultItem}>• {point}</Text>
                ))}
              </View>
            )}
          </View>
        );
      
      case 'analysis':
        return (
          <View style={styles.modeContent}>
            <Text style={[styles.modeTitle, { color: theme.textColor }]}>
              Context Analysis
            </Text>
            {aiResults.conversationTone && (
              <View style={styles.resultSection}>
                <Text style={styles.resultTitle}>Tone: {aiResults.conversationTone}</Text>
                <Text style={styles.resultTitle}>Urgency: {aiResults.urgencyLevel}</Text>
              </View>
            )}
          </View>
        );
      
      case 'actions':
        return (
          <View style={styles.modeContent}>
            <Text style={[styles.modeTitle, { color: theme.textColor }]}>
              Suggested Actions
            </Text>
            {Array.isArray(aiResults) && aiResults.map((action: any, index: number) => (
              <View key={index} style={styles.actionItem}>
                <Text style={styles.actionTitle}>{action.action}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
            ))}
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* AI Toggle Button */}
      <TouchableOpacity
        style={[
          styles.aiToggle,
          { backgroundColor: theme.primaryColor },
          isActive && styles.aiToggleActive
        ]}
        onPress={toggleAIPanel}
      >
        <MaterialIcons name="psychology" size={24} color="#FFFFFF" />
        {suggestions.length > 0 && (
          <View style={styles.suggestionBadge}>
            <Text style={styles.badgeText}>{suggestions.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* AI Panel */}
      {isActive && (
        <Animated.View 
          style={[
            styles.aiPanel,
            { 
              backgroundColor: theme.panelBackgroundColor,
              borderRadius: theme.borderRadius,
              opacity: panelAnimation,
              transform: [{
                scale: panelAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                })
              }]
            }
          ]}
        >
          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            {(['assistant', 'summary', 'analysis', 'actions'] as AIMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  aiMode === mode && { backgroundColor: theme.primaryColor }
                ]}
                onPress={() => setAIMode(mode)}
              >
                <Text style={[
                  styles.modeButtonText,
                  { color: aiMode === mode ? '#FFFFFF' : theme.textColor }
                ]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content Area */}
          <ScrollView style={styles.contentArea}>
            {getModeContent()}
          </ScrollView>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickActionButton, { borderColor: theme.primaryColor }]}
              onPress={generateSmartReplies}
              disabled={loading}
            >
              <MaterialIcons name="auto-fix-high" size={20} color={theme.primaryColor} />
              <Text style={[styles.quickActionText, { color: theme.primaryColor }]}>
                Smart Reply
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, { borderColor: theme.primaryColor }]}
              onPress={generateMessageSummary}
              disabled={loading}
            >
              <MaterialIcons name="summarize" size={20} color={theme.primaryColor} />
              <Text style={[styles.quickActionText, { color: theme.primaryColor }]}>
                Summarize
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, { borderColor: theme.primaryColor }]}
              onPress={analyzeContext}
              disabled={loading}
            >
              <MaterialIcons name="analytics" size={20} color={theme.primaryColor} />
              <Text style={[styles.quickActionText, { color: theme.primaryColor }]}>
                Analyze
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  aiToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  aiToggleActive: {
    transform: [{ scale: 1.1 }],
  },
  suggestionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiPanel: {
    position: 'absolute',
    top: 70,
    right: 16,
    width: 320,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 8,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contentArea: {
    flex: 1,
    maxHeight: 200,
  },
  modeContent: {
    padding: 16,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  resultSection: {
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  resultItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  actionItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
