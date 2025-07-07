/**
 * SkeletonLoader - Universal loading states for all components
 * 
 * Features:
 * - Multiple skeleton types (list, form, card, detail)
 * - Animated shimmer effect
 * - Configurable count and layout
 * - iOS native appearance
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

export interface SkeletonLoaderProps {
  type: 'list' | 'form' | 'card' | 'detail' | 'chat' | 'activity';
  count?: number;
  animated?: boolean;
  style?: any;
}

export default function SkeletonLoader({ 
  type, 
  count = 1, 
  animated = true,
  style 
}: SkeletonLoaderProps) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    const shimmer = () => {
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(() => shimmer());
    };

    shimmer();
  }, [animated, shimmerAnimation]);

  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonBox = ({ width, height, style: boxStyle }: { 
    width: number | string; 
    height: number; 
    style?: any;
  }) => (
    <Animated.View
      style={[
        styles.skeletonBox,
        { width, height },
        animated && { opacity: shimmerOpacity },
        boxStyle,
      ]}
    />
  );

  const renderListSkeleton = () => (
    <View style={styles.listItem}>
      <SkeletonBox width={40} height={40} style={styles.avatar} />
      <View style={styles.listContent}>
        <SkeletonBox width="70%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBox width="50%" height={14} />
      </View>
      <SkeletonBox width={20} height={20} />
    </View>
  );

  const renderFormSkeleton = () => (
    <View style={styles.formContainer}>
      <SkeletonBox width="30%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={44} style={{ marginBottom: 20 }} />
      
      <SkeletonBox width="40%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={44} style={{ marginBottom: 20 }} />
      
      <SkeletonBox width="25%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={44} style={{ marginBottom: 20 }} />
      
      <SkeletonBox width="35%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width="100%" height={100} />
    </View>
  );

  const renderCardSkeleton = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonBox width={32} height={32} style={styles.avatar} />
        <View style={styles.cardHeaderContent}>
          <SkeletonBox width="60%" height={16} style={{ marginBottom: 4 }} />
          <SkeletonBox width="40%" height={14} />
        </View>
      </View>
      <SkeletonBox width="100%" height={60} style={{ marginTop: 12 }} />
      <View style={styles.cardFooter}>
        <SkeletonBox width="30%" height={14} />
        <SkeletonBox width="20%" height={14} />
      </View>
    </View>
  );

  const renderDetailSkeleton = () => (
    <View style={styles.detailContainer}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <SkeletonBox width={60} height={60} style={styles.avatar} />
        <View style={styles.detailHeaderContent}>
          <SkeletonBox width="80%" height={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width="60%" height={16} style={{ marginBottom: 4 }} />
          <SkeletonBox width="40%" height={14} />
        </View>
      </View>
      
      {/* Content sections */}
      <View style={styles.detailSection}>
        <SkeletonBox width="25%" height={16} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBox width="80%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBox width="90%" height={14} />
      </View>
      
      <View style={styles.detailSection}>
        <SkeletonBox width="30%" height={16} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBox width="70%" height={14} />
      </View>
    </View>
  );

  const renderChatSkeleton = () => (
    <View style={styles.chatContainer}>
      <View style={styles.chatMessage}>
        <SkeletonBox width={32} height={32} style={styles.avatar} />
        <View style={styles.chatBubble}>
          <SkeletonBox width="100%" height={14} style={{ marginBottom: 4 }} />
          <SkeletonBox width="80%" height={14} />
        </View>
      </View>
      <View style={[styles.chatMessage, styles.chatMessageRight]}>
        <View style={[styles.chatBubble, styles.chatBubbleRight]}>
          <SkeletonBox width="90%" height={14} style={{ marginBottom: 4 }} />
          <SkeletonBox width="60%" height={14} />
        </View>
      </View>
    </View>
  );

  const renderActivitySkeleton = () => (
    <View style={styles.activityItem}>
      <SkeletonBox width={32} height={32} style={styles.avatar} />
      <View style={styles.activityContent}>
        <SkeletonBox width="70%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonBox width="50%" height={14} style={{ marginBottom: 4 }} />
        <SkeletonBox width="30%" height={12} />
      </View>
      <SkeletonBox width={16} height={16} />
    </View>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'list':
        return renderListSkeleton();
      case 'form':
        return renderFormSkeleton();
      case 'card':
        return renderCardSkeleton();
      case 'detail':
        return renderDetailSkeleton();
      case 'chat':
        return renderChatSkeleton();
      case 'activity':
        return renderActivitySkeleton();
      default:
        return renderListSkeleton();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={index > 0 && styles.itemSpacing}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemSpacing: {
    marginTop: 12,
  },
  skeletonBox: {
    backgroundColor: '#E1E1E6',
    borderRadius: 4,
  },
  
  // List skeleton
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
  avatar: {
    borderRadius: 20,
  },
  
  // Form skeleton
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  
  // Card skeleton
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  
  // Detail skeleton
  detailContainer: {
    paddingHorizontal: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  detailHeaderContent: {
    flex: 1,
    marginLeft: 16,
  },
  detailSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  
  // Chat skeleton
  chatContainer: {
    paddingHorizontal: 16,
  },
  chatMessage: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  chatMessageRight: {
    flexDirection: 'row-reverse',
  },
  chatBubble: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    padding: 12,
    marginLeft: 8,
    maxWidth: '70%',
  },
  chatBubbleRight: {
    backgroundColor: '#007AFF15',
    marginLeft: 0,
    marginRight: 8,
  },
  
  // Activity skeleton
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
});
