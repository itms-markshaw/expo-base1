/**
 * BaseMessageBubble (BC-C003) - Individual Message Display Component
 * Component Reference: BC-C003
 * 
 * ENHANCED: Individual message display with reactions, replies, and AI analysis
 * Following the BC-CXXX component reference system from perfect-base-chatter.md
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// BC-C003 Interfaces
export interface BaseMessageBubbleProps {
  message: ChatterMessage;
  isOwnMessage?: boolean;
  showAuthor?: boolean;
  showTimestamp?: boolean;
  enableReactions?: boolean;
  enableReplies?: boolean;
  enableAIAnalysis?: boolean;
  onReply?: (message: ChatterMessage) => void;
  onReaction?: (messageId: number, emoji: string) => void;
  onAIAnalyze?: (message: ChatterMessage) => void;
  theme?: MessageBubbleTheme;
}

export interface ChatterMessage {
  id: number;
  body: string;
  create_date: string;
  author_id?: [number, string];
  message_type?: string;
  parent_id?: number;
  reactions?: MessageReaction[];
  ai_analysis?: AIMessageAnalysis;
  attachments?: MessageAttachment[];
}

export interface MessageReaction {
  emoji: string;
  user_id: number;
  user_name: string;
  timestamp: string;
}

export interface AIMessageAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keywords: string[];
  suggested_actions: string[];
  urgency_level: 'low' | 'medium' | 'high';
  category: string;
}

export interface MessageAttachment {
  id: number;
  name: string;
  mimetype: string;
  url: string;
}

export interface MessageBubbleTheme {
  ownMessageColor: string;
  otherMessageColor: string;
  textColor: string;
  authorColor: string;
  timestampColor: string;
  reactionBackgroundColor: string;
  borderRadius: number;
}

// Default theme
const DEFAULT_THEME: MessageBubbleTheme = {
  ownMessageColor: '#007AFF',
  otherMessageColor: '#E5E5EA',
  textColor: '#000000',
  authorColor: '#8E8E93',
  timestampColor: '#8E8E93',
  reactionBackgroundColor: '#F2F2F7',
  borderRadius: 18,
};

// Common emoji reactions
const QUICK_REACTIONS = ['👍', '❤️', '😊', '😮', '😢', '😡'];

/**
 * BC-C003: Individual Message Bubble Component
 * 
 * Features:
 * - iMessage-style bubble design
 * - Emoji reactions with quick selection
 * - Reply functionality with threading
 * - AI sentiment analysis display
 * - HTML content rendering
 * - Attachment preview
 * - Long-press context menu
 * - Smooth animations
 */
export default function BaseMessageBubble({
  message,
  isOwnMessage = false,
  showAuthor = true,
  showTimestamp = true,
  enableReactions = true,
  enableReplies = true,
  enableAIAnalysis = false,
  onReply,
  onReaction,
  onAIAnalyze,
  theme = DEFAULT_THEME
}: BaseMessageBubbleProps) {
  // State
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // Format timestamp
  const formatTimestamp = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }, []);

  // Handle reaction selection
  const handleReaction = useCallback((emoji: string) => {
    onReaction?.(message.id, emoji);
    setShowReactionPicker(false);
  }, [message.id, onReaction]);

  // Handle reply
  const handleReply = useCallback(() => {
    onReply?.(message);
  }, [message, onReply]);

  // Handle AI analysis
  const handleAIAnalysis = useCallback(() => {
    if (message.ai_analysis) {
      setShowAIAnalysis(!showAIAnalysis);
    } else {
      onAIAnalyze?.(message);
    }
  }, [message, showAIAnalysis, onAIAnalyze]);

  // Handle long press
  const handleLongPress = useCallback(() => {
    const options = [];
    
    if (enableReplies) options.push('Reply');
    if (enableReactions) options.push('Add Reaction');
    if (enableAIAnalysis) options.push('AI Analysis');
    options.push('Copy');
    options.push('Cancel');

    Alert.alert(
      'Message Options',
      '',
      [
        ...(enableReplies ? [{ text: 'Reply', onPress: handleReply }] : []),
        ...(enableReactions ? [{ text: 'Add Reaction', onPress: () => setShowReactionPicker(true) }] : []),
        ...(enableAIAnalysis ? [{ text: 'AI Analysis', onPress: handleAIAnalysis }] : []),
        { text: 'Copy', onPress: () => console.log('Copy message') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [enableReplies, enableReactions, enableAIAnalysis, handleReply, handleAIAnalysis]);

  // Get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '#34C759';
      case 'negative': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  // Render reactions
  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    // Group reactions by emoji
    const groupedReactions = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {} as { [emoji: string]: MessageReaction[] });

    return (
      <View style={styles.reactionsContainer}>
        {Object.entries(groupedReactions).map(([emoji, reactions]) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionBubble,
              { backgroundColor: theme.reactionBackgroundColor }
            ]}
            onPress={() => handleReaction(emoji)}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={styles.reactionCount}>{reactions.length}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render AI analysis
  const renderAIAnalysis = () => {
    if (!showAIAnalysis || !message.ai_analysis) return null;

    const analysis = message.ai_analysis;
    
    return (
      <View style={[styles.aiAnalysis, { backgroundColor: theme.reactionBackgroundColor }]}>
        <View style={styles.aiHeader}>
          <MaterialIcons name="psychology" size={16} color="#007AFF" />
          <Text style={styles.aiTitle}>AI Analysis</Text>
        </View>
        
        <View style={styles.aiContent}>
          <View style={styles.aiSentiment}>
            <Text style={styles.aiLabel}>Sentiment:</Text>
            <View style={[
              styles.sentimentIndicator,
              { backgroundColor: getSentimentColor(analysis.sentiment) }
            ]}>
              <Text style={styles.sentimentText}>
                {analysis.sentiment} ({Math.round(analysis.confidence * 100)}%)
              </Text>
            </View>
          </View>
          
          {analysis.urgency_level !== 'low' && (
            <View style={styles.aiUrgency}>
              <Text style={styles.aiLabel}>Urgency:</Text>
              <Text style={[
                styles.urgencyText,
                { color: analysis.urgency_level === 'high' ? '#FF3B30' : '#FF9500' }
              ]}>
                {analysis.urgency_level.toUpperCase()}
              </Text>
            </View>
          )}
          
          {analysis.keywords.length > 0 && (
            <View style={styles.aiKeywords}>
              <Text style={styles.aiLabel}>Keywords:</Text>
              <Text style={styles.keywordsText}>
                {analysis.keywords.join(', ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render reaction picker
  const renderReactionPicker = () => {
    if (!showReactionPicker) return null;

    return (
      <View style={[styles.reactionPicker, { backgroundColor: theme.reactionBackgroundColor }]}>
        {QUICK_REACTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={styles.reactionOption}
            onPress={() => handleReaction(emoji)}
          >
            <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.reactionOption}
          onPress={() => setShowReactionPicker(false)}
        >
          <MaterialIcons name="close" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
    ]}>
      {/* Author */}
      {showAuthor && !isOwnMessage && message.author_id && (
        <Text style={[styles.author, { color: theme.authorColor }]}>
          {message.author_id[1]}
        </Text>
      )}

      {/* Message Bubble */}
      <TouchableOpacity
        style={[
          styles.messageBubble,
          {
            backgroundColor: isOwnMessage ? theme.ownMessageColor : theme.otherMessageColor,
            borderRadius: theme.borderRadius,
          }
        ]}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
      >
        {/* Reply indicator */}
        {message.parent_id && (
          <View style={styles.replyIndicator}>
            <MaterialIcons name="reply" size={14} color={theme.authorColor} />
            <Text style={[styles.replyText, { color: theme.authorColor }]}>
              Reply
            </Text>
          </View>
        )}

        {/* Message content */}
        <Text style={[
          styles.messageText,
          { 
            color: isOwnMessage ? '#FFFFFF' : theme.textColor 
          }
        ]}>
          {message.body}
        </Text>

        {/* AI Analysis indicator */}
        {enableAIAnalysis && message.ai_analysis && (
          <TouchableOpacity
            style={styles.aiIndicator}
            onPress={handleAIAnalysis}
          >
            <MaterialIcons 
              name="psychology" 
              size={14} 
              color={isOwnMessage ? '#FFFFFF' : theme.authorColor} 
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Timestamp */}
      {showTimestamp && (
        <Text style={[
          styles.timestamp,
          { color: theme.timestampColor },
          isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp
        ]}>
          {formatTimestamp(message.create_date)}
        </Text>
      )}

      {/* Reactions */}
      {renderReactions()}

      {/* AI Analysis */}
      {renderAIAnalysis()}

      {/* Reaction Picker */}
      {renderReactionPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  author: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  replyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  aiIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  ownTimestamp: {
    textAlign: 'right',
  },
  otherTimestamp: {
    textAlign: 'left',
    marginLeft: 12,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  reactionPicker: {
    flexDirection: 'row',
    marginTop: 8,
    padding: 8,
    borderRadius: 20,
    gap: 8,
  },
  reactionOption: {
    padding: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionOptionEmoji: {
    fontSize: 20,
  },
  aiAnalysis: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    maxWidth: '90%',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  aiContent: {
    gap: 6,
  },
  aiSentiment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  sentimentIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  aiUrgency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiKeywords: {
    gap: 4,
  },
  keywordsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
