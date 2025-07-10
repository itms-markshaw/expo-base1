/**
 * BC-C153_TypingIndicator.tsx - Typing Users Indicator Component
 * 
 * Features:
 * - Animated typing dots
 * - Multiple users display
 * - Smooth show/hide animations
 * - Customizable styling
 * - Performance optimized with React.memo
 * 
 * Props:
 * - typingUsers: Array of user names who are typing
 * - maxUsersToShow: Maximum number of users to display
 * - showAnimation: Whether to show animated dots
 * - style: Custom container styling
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';

interface TypingIndicatorProps {
  typingUsers: string[];
  maxUsersToShow?: number;
  showAnimation?: boolean;
  style?: ViewStyle;
}

const TypingIndicator = React.memo(({
  typingUsers,
  maxUsersToShow = 3,
  showAnimation = true,
  style,
}: TypingIndicatorProps) => {
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const isVisible = typingUsers.length > 0;

  // Show/hide animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fadeAnim]);

  // Typing dots animation
  useEffect(() => {
    if (isVisible && showAnimation) {
      const createDotAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );
      };

      animationRef.current = Animated.parallel([
        createDotAnimation(dot1Anim, 0),
        createDotAnimation(dot2Anim, 200),
        createDotAnimation(dot3Anim, 400),
      ]);

      animationRef.current.start();
    } else {
      // Stop animation
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      
      // Reset dot animations
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isVisible, showAnimation, dot1Anim, dot2Anim, dot3Anim]);

  const formatTypingText = () => {
    if (typingUsers.length === 0) return '';

    const displayUsers = typingUsers.slice(0, maxUsersToShow);
    const remainingCount = typingUsers.length - maxUsersToShow;

    let text = '';
    
    if (displayUsers.length === 1) {
      text = `${displayUsers[0]} is typing`;
    } else if (displayUsers.length === 2) {
      text = `${displayUsers[0]} and ${displayUsers[1]} are typing`;
    } else {
      const lastUser = displayUsers.pop();
      text = `${displayUsers.join(', ')}, and ${lastUser} are typing`;
    }

    if (remainingCount > 0) {
      text += ` (+${remainingCount} more)`;
    }

    return text;
  };

  const renderTypingDots = () => {
    if (!showAnimation) return null;

    return (
      <View style={styles.dotsContainer}>
        <Animated.View style={[
          styles.dot,
          { opacity: dot1Anim }
        ]} />
        <Animated.View style={[
          styles.dot,
          { opacity: dot2Anim }
        ]} />
        <Animated.View style={[
          styles.dot,
          { opacity: dot3Anim }
        ]} />
      </View>
    );
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[
      styles.container,
      style,
      { opacity: fadeAnim }
    ]}>
      <View style={styles.content}>
        <Text style={styles.typingText}>
          {formatTypingText()}
        </Text>
        {renderTypingDots()}
      </View>
    </Animated.View>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F2F2F7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    flex: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
    marginHorizontal: 2,
  },
});

export default TypingIndicator;
