import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const TelegramInputBar = ({
  value,
  onChangeText,
  onSend,
  sending,
  colors,
  placeholder,
  inputRef,
  onAttachmentPress,
  onVoicePress,
  onStickerPress
}) => {
  const [inputHeight, setInputHeight] = useState(40);
  const [isRecording, setIsRecording] = useState(false);
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const recordingAnimation = useRef(new Animated.Value(0)).current;

  const maxInputHeight = 120;
  const minInputHeight = 40;

  // Animate send button when message is typed
  useEffect(() => {
    Animated.spring(sendButtonScale, {
      toValue: value.trim() ? 1.1 : 1,
      useNativeDriver: true,
      tension: 150,
      friction: 8,
    }).start();
  }, [value, sendButtonScale]);

  // Handle content size change for auto-expanding input
  const handleContentSizeChange = (event) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.max(minInputHeight, Math.min(maxInputHeight, height));
    setInputHeight(newHeight);
  };

  // Handle send button press with animation
  const handleSendPress = () => {
    if (!value.trim() || sending) return;

    // Animate button press
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onSend();
  };

  // Handle attachment press
  const handleAttachmentPress = () => {
    Alert.alert(
      'Attachments',
      'Choose attachment type',
      [
        { text: 'Photo', onPress: () => console.log('Photo selected') },
        { text: 'Document', onPress: () => console.log('Document selected') },
        { text: 'Location', onPress: () => console.log('Location selected') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Handle voice recording
  const handleVoicePress = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      Animated.timing(recordingAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      console.log('Stop recording');
    } else {
      // Start recording
      setIsRecording(true);
      Animated.timing(recordingAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      console.log('Start recording');
    }
  };

  const showSendButton = value.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardContainer, { backgroundColor: '#FFFFFF' }]}
    >
      <View style={[styles.inputContainer, { backgroundColor: '#FFFFFF' }]}>
        {/* Attachment Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.background }]}
          onPress={handleAttachmentPress}
          disabled={sending}
        >
          <Icon name="paperclip" size={24} color={colors.primary} />
        </TouchableOpacity>

        {/* Text Input Container */}
        <View style={[styles.inputWrapper, { backgroundColor: colors.background }]}>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              { 
                color: colors.text,
                height: inputHeight,
                maxHeight: maxInputHeight,
              }
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline={true}
            textAlignVertical="center"
            onContentSizeChange={handleContentSizeChange}
            scrollEnabled={inputHeight >= maxInputHeight}
            blurOnSubmit={false}
            returnKeyType="default"
          />

          {/* Sticker/Emoji Button */}
          <TouchableOpacity
            style={styles.stickerButton}
            onPress={() => Alert.alert('Stickers', 'Sticker picker coming soon')}
            disabled={sending}
          >
            <Icon name="emoticon-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Send/Voice Button */}
        {showSendButton ? (
          <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: colors.primary }]}
              onPress={handleSendPress}
              disabled={sending}
            >
              {sending ? (
                <Icon name="clock-outline" size={20} color={colors.onPrimary} />
              ) : (
                <Icon name="send" size={20} color={colors.onPrimary} />
              )}
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale: recordingAnimation }] }}>
            <TouchableOpacity
              style={[
                styles.voiceButton,
                { 
                  backgroundColor: isRecording ? colors.error : colors.primary,
                }
              ]}
              onPress={handleVoicePress}
              disabled={sending}
            >
              <Icon 
                name={isRecording ? "stop" : "microphone"} 
                size={20} 
                color={colors.onPrimary} 
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Recording Indicator */}
      {isRecording && (
        <Animated.View 
          style={[
            styles.recordingIndicator,
            { 
              backgroundColor: colors.error + '20',
              opacity: recordingAnimation,
            }
          ]}
        >
          <View style={[styles.recordingDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.recordingText, { color: colors.error }]}>
            Recording... Tap to stop
          </Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 0,
    paddingRight: 8,
    textAlignVertical: 'center',
  },
  stickerButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TelegramInputBar;
