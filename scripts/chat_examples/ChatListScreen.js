import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import EnhancedDiscussAPI from '../../api/models/discussApi.enhanced';
import ConversationListItem from '../../components/chat/ConversationListItem';
import SearchBar from '../../components/chat/SearchBar';
import FloatingActionButton from '../../components/common/FloatingActionButton';
import EmptyState from '../../components/common/EmptyState';
import { chatStyles } from '../../styles/chatStyles';

const ChatListScreen = ({ navigation }) => {
  // State management
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);

  // Refs
  const chatAPI = useRef(new EnhancedDiscussAPI()).current;
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const refreshIntervalRef = useRef(null);

  // Initialize chat API and load conversations
  const initializeChat = useCallback(async () => {
    try {
      setError(null);
      console.log('🚀 Initializing chat...');
      
      await chatAPI.initialize();
      await loadConversations();
      await loadUnreadCount();
      
      console.log('✅ Chat initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize chat:', error);
      setError('Failed to load conversations. Please try again.');
      Alert.alert('Error', 'Failed to connect to chat service. Please check your connection and try again.');
    }
  }, []);

  // Load all conversations
  const loadConversations = useCallback(async (forceRefresh = false) => {
    try {
      console.log('📱 Loading conversations...');
      
      const allConversations = await chatAPI.getAllConversations({
        forceRefresh,
        includeChannels: true,
        includeDirectMessages: true,
        limit: 100
      });

      setConversations(allConversations);
      setFilteredConversations(allConversations);
      
      console.log(`✅ Loaded ${allConversations.length} conversations`);
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      setError('Failed to load conversations');
    }
  }, [chatAPI]);

  // Load unread message count
  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await chatAPI.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ Failed to load unread count:', error);
    }
  }, [chatAPI]);

  // Handle search
  const handleSearch = useCallback((text) => {
    setSearchText(text);
    
    if (!text.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter(conv => 
      conv.displayName?.toLowerCase().includes(text.toLowerCase()) ||
      conv.description?.toLowerCase().includes(text.toLowerCase()) ||
      conv.subtitle?.toLowerCase().includes(text.toLowerCase())
    );

    setFilteredConversations(filtered);
  }, [conversations]);

  // Toggle search mode
  const toggleSearchMode = useCallback(() => {
    const newSearchMode = !searchMode;
    setSearchMode(newSearchMode);
    
    Animated.timing(searchAnimation, {
      toValue: newSearchMode ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();

    if (!newSearchMode) {
      setSearchText('');
      setFilteredConversations(conversations);
    }
  }, [searchMode, searchAnimation, conversations]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations(true);
    await loadUnreadCount();
    setRefreshing(false);
  }, [loadConversations, loadUnreadCount]);

  // Navigate to chat screen
  const navigateToChat = useCallback((conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      conversationName: conversation.displayName,
      conversationType: conversation.isChannel ? 'channel' : 'direct',
      conversation: conversation
    });
  }, [navigation]);

  // Navigate to new chat screen
  const navigateToNewChat = useCallback(() => {
    navigation.navigate('NewChat');
  }, [navigation]);

  // Handle conversation long press
  const handleConversationLongPress = useCallback((conversation) => {
    Alert.alert(
      conversation.displayName,
      'Choose an action',
      [
        {
          text: conversation.isPinned ? 'Unpin' : 'Pin',
          onPress: () => togglePin(conversation)
        },
        {
          text: 'Mark as Read',
          onPress: () => markAsRead(conversation)
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => confirmLeaveConversation(conversation)
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  }, []);

  // Toggle pin conversation
  const togglePin = useCallback(async (conversation) => {
    try {
      await chatAPI.toggleConversationPin(conversation.id, !conversation.isPinned);
      await loadConversations(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to update conversation');
    }
  }, [chatAPI, loadConversations]);

  // Mark conversation as read
  const markAsRead = useCallback(async (conversation) => {
    try {
      await chatAPI.markConversationAsRead(conversation.id);
      await loadConversations(true);
      await loadUnreadCount();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as read');
    }
  }, [chatAPI, loadConversations, loadUnreadCount]);

  // Confirm leave conversation
  const confirmLeaveConversation = useCallback((conversation) => {
    Alert.alert(
      'Leave Conversation',
      `Are you sure you want to leave "${conversation.displayName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => leaveConversation(conversation)
        }
      ]
    );
  }, []);

  // Leave conversation
  const leaveConversation = useCallback(async (conversation) => {
    try {
      await chatAPI.leaveConversation(conversation.id);
      await loadConversations(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to leave conversation');
    }
  }, [chatAPI, loadConversations]);

  // Set up auto-refresh with safer timeout approach
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearTimeout(refreshIntervalRef.current);
    }

    // Use timeout recursion instead of setInterval to avoid threading issues
    const scheduleRefresh = () => {
      refreshIntervalRef.current = setTimeout(() => {
        try {
          loadUnreadCount();
          // Only refresh conversations if not searching
          if (!searchMode) {
            loadConversations(true);
          }
        } catch (error) {
          console.warn('Auto-refresh error:', error);
        } finally {
          // Schedule next refresh
          scheduleRefresh();
        }
      }, 30000);
    };

    scheduleRefresh();

    return () => {
      if (refreshIntervalRef.current) {
        clearTimeout(refreshIntervalRef.current);
      }
    };
  }, [searchMode, loadConversations, loadUnreadCount]);

  // Focus effect to refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
      if (!searchMode) {
        loadConversations(true);
      }
    }, [searchMode, loadConversations, loadUnreadCount])
  );

  // Initial load
  useEffect(() => {
    initializeChat();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [initializeChat]);

  // Render conversation item
  const renderConversationItem = useCallback(({ item, index }) => (
    <ConversationListItem
      conversation={item}
      onPress={() => navigateToChat(item)}
      onLongPress={() => handleConversationLongPress(item)}
      index={index}
    />
  ), [navigateToChat, handleConversationLongPress]);

  // Render empty state
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={chatStyles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={chatStyles.loadingText}>Loading conversations...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Connection Error"
          subtitle={error}
          actionText="Try Again"
          onAction={initializeChat}
        />
      );
    }

    if (searchText && filteredConversations.length === 0) {
      return (
        <EmptyState
          icon="search-outline"
          title="No Results"
          subtitle={`No conversations found for "${searchText}"`}
        />
      );
    }

    return (
      <EmptyState
        icon="chatbubbles-outline"
        title="No Conversations"
        subtitle="Start a new conversation to get chatting!"
        actionText="New Chat"
        onAction={navigateToNewChat}
      />
    );
  };

  // Header component
  const renderHeader = () => (
    <View style={chatStyles.header}>
      <View style={chatStyles.headerTop}>
        <Text style={chatStyles.headerTitle}>
          Chats
          {unreadCount > 0 && (
            <Text style={chatStyles.unreadBadge}> ({unreadCount})</Text>
          )}
        </Text>
        
        <TouchableOpacity
          style={chatStyles.headerButton}
          onPress={toggleSearchMode}
        >
          <Ionicons 
            name={searchMode ? "close" : "search"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      <Animated.View style={[
        chatStyles.searchContainer,
        {
          height: searchAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 50],
          }),
          opacity: searchAnimation,
        }
      ]}>
        {searchMode && (
          <SearchBar
            value={searchText}
            onChangeText={handleSearch}
            placeholder="Search conversations..."
            autoFocus={true}
          />
        )}
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={chatStyles.container}>
      {renderHeader()}
      
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => `conversation-${item.id}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredConversations.length === 0 ? chatStyles.emptyListContainer : null
        }
        ItemSeparatorComponent={() => <View style={chatStyles.separator} />}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
      />

      <FloatingActionButton
        icon="add"
        onPress={navigateToNewChat}
        style={chatStyles.fab}
      />
    </SafeAreaView>
  );
};

export default ChatListScreen;