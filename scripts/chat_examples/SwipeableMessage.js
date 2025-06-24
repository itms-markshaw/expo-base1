import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// Haptics import with fallback for Expo Go
let Haptics;
try {
  Haptics = require('expo-haptics');
} catch (error) {
  console.log('Haptics not available in Expo Go');
  Haptics = {
    impactAsync: () => Promise.resolve(),
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' }
  };
}
import TelegramMessage from './TelegramMessage';

const SwipeableMessage = ({
  message,
  isOwn,
  showAvatar,
  showTimestamp,
  colors,
  onLongPress,
  onPress,
  onSwipeToReply
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const panRef = useRef(null);
  const isReplying = useRef(false);

  // Handle pan gesture
  const onGestureEvent = useCallback((event) => {
    const { translationX } = event.nativeEvent;
    
    // Only allow swipe to the left (negative translation) for reply
    // And only if it's not our own message (can't reply to own messages typically)
    if (!isOwn && translationX < 0) {
      const clampedTranslation = Math.max(translationX, -80); // Max swipe distance
      translateX.setValue(clampedTranslation);
    }
  }, [isOwn, translateX]);

  // Handle gesture state changes
  const onHandlerStateChange = useCallback((event) => {
    const { state, translationX } = event.nativeEvent;

    if (state === State.END) {
      // If swiped far enough to the left, trigger reply
      if (!isOwn && translationX < -60 && !isReplying.current) {
        isReplying.current = true;
        
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Trigger reply callback
        onSwipeToReply?.(message);
        
        // Reset after a short delay
        setTimeout(() => {
          isReplying.current = false;
        }, 300);
      }

      // Animate back to original position
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isOwn, message, onSwipeToReply, translateX]);

  // Calculate reply icon opacity based on swipe distance
  const replyIconOpacity = translateX.interpolate({
    inputRange: [-80, -30, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Calculate reply icon scale
  const replyIconScale = translateX.interpolate({
    inputRange: [-80, -30, 0],
    outputRange: [1, 0.8, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Reply icon (shown when swiping) */}
      {!isOwn && (
        <Animated.View
          style={[
            styles.replyIconContainer,
            {
              opacity: replyIconOpacity,
              transform: [{ scale: replyIconScale }],
            },
          ]}
        >
          <View style={[styles.replyIcon, { backgroundColor: colors.primary }]}>
            <Icon name="reply" size={20} color={colors.onPrimary} />
          </View>
        </Animated.View>
      )}

      {/* Swipeable message */}
      <PanGestureHandler
        ref={panRef}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-20, 20]}
        enabled={!isOwn} // Only enable swipe for other messages
      >
        <Animated.View
          style={[
            styles.messageWrapper,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <TelegramMessage
            message={message}
            isOwn={isOwn}
            showAvatar={showAvatar}
            showTimestamp={showTimestamp}
            colors={colors}
            onLongPress={onLongPress}
            onPress={onPress}
          />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  messageWrapper: {
    flex: 1,
  },
  replyIconContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    zIndex: 1,
    transform: [{ translateY: -20 }],
  },
  replyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default SwipeableMessage;
