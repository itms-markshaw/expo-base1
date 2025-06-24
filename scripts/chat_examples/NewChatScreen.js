import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SectionList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import EnhancedDiscussAPI from '../../api/models/discussApi.enhanced';
import SearchBar from '../../components/chat/SearchBar';
import UserListItem from '../../components/chat/UserListItem';
import EmptyState from '../../components/common/EmptyState';
import { chatStyles } from '../../styles/chatStyles';

const NewChatScreen = ({ navigation }) => {
  // State management
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupMode, setGroupMode] = useState(false);

  // Refs
  const chatAPI = useRef(new EnhancedDiscussAPI()).current;
  const searchTimeoutRef = useRef(null);

  // Search for users
  const searchUsers = useCallback(async (searchText) => {
    if (!searchText.trim()) {
      setUsers([]);
      setFilteredUsers([]);
      return;
    }

    try {
      setLoading(true);
      console.log(`🔍 Searching users: "${searchText}"`);

      const searchResults = await chatAPI.partners.searchUsers(searchText, {
        limit: 50,
        includeInternal: true
      });

      setUsers(searchResults);
      setFilteredUsers(searchResults);
      
      console.log(`✅ Found ${searchResults.length} users`);
    } catch (error) {
      console.error('❌ Failed to search users:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [chatAPI]);

  // Handle search input
  const handleSearch = useCallback((text) => {
    setSearchText(text);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search to avoid too many API calls
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(text);
    }, 500);
  }, [searchUsers]);

  // Start direct message
  const startDirectMessage = useCallback(async (user) => {
    try {
      setCreating(true);
      console.log(`💬 Starting DM with ${user.name}`);

      const dmChannel = await chatAPI.partners.startDirectMessage(user.id, user.name);
      
      if (dmChannel) {
        navigation.replace('Chat', {
          conversationId: dmChannel.id,
          conversationName: dmChannel.name || user.name,
          conversationType: 'direct',
          conversation: {
            ...dmChannel,
            displayName: user.name,
            isDirectMessage: true
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to start DM:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [chatAPI, navigation]);

  // Toggle user selection for group
  const toggleUserSelection = useCallback((user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  // Create group chat
  const createGroupChat = useCallback(async () => {
    if (selectedUsers.length < 2) {
      Alert.alert('Error', 'Please select at least 2 users to create a group chat.');
      return;
    }

    Alert.prompt(
      'Group Name',
      'Enter a name for your group chat',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Create',
          onPress: async (groupName) => {
            if (!groupName?.trim()) {
              Alert.alert('Error', 'Please enter a group name.');
              return;
            }
            await createGroup(groupName.trim());
          }
        }
      ],
      'plain-text'
    );
  }, [selectedUsers]);

  // Create group helper
  const createGroup = useCallback(async (groupName) => {
    try {
      setCreating(true);
      console.log(`👥 Creating group: ${groupName}`);

      const memberIds = selectedUsers.map(user => user.id);
      const channelId = await chatAPI.channels.createChannel(
        groupName,
        `Group chat with ${selectedUsers.length} members`,
        'channel',
        memberIds,
        false // private group
      );

      if (channelId) {
        navigation.replace('Chat', {
          conversationId: channelId,
          conversationName: groupName,
          conversationType: 'channel',
          conversation: {
            id: channelId,
            name: groupName,
            displayName: groupName,
            isChannel: true,
            memberCount: selectedUsers.length + 1
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      Alert.alert('Error', 'Failed to create group chat. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [selectedUsers, chatAPI, navigation]);

  // Handle user press
  const handleUserPress = useCallback((user) => {
    if (groupMode) {
      toggleUserSelection(user);
    } else {
      startDirectMessage(user);
    }
  }, [groupMode, toggleUserSelection, startDirectMessage]);

  // Toggle group mode
  const toggleGroupMode = useCallback(() => {
    setGroupMode(prev => !prev);
    setSelectedUsers([]);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchText('');
    setUsers([]);
    setFilteredUsers([]);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Render user item
  const renderUserItem = useCallback(({ item }) => {
    const isSelected = selectedUsers.find(u => u.id === item.id);
    
    return (
      <UserListItem
        user={item}
        onPress={() => handleUserPress(item)}
        selected={groupMode && isSelected}
        showCheckbox={groupMode}
        disabled={creating}
      />
    );
  }, [selectedUsers, groupMode, handleUserPress, creating]);

  // Render empty state
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={chatStyles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={chatStyles.loadingText}>Searching users...</Text>
        </View>
      );
    }

    if (!searchText.trim()) {
      return (
        <EmptyState
          icon="search-outline"
          title="Search for Users"
          subtitle="Type a name or email to find users to chat with"
        />
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <EmptyState
          icon="person-outline"
          title="No Users Found"
          subtitle={`No users found for "${searchText}"`}
        />
      );
    }

    return null;
  };

  // Render header
  const renderHeader = () => (
    <View style={chatStyles.newChatHeader}>
      <View style={chatStyles.headerRow}>
        <TouchableOpacity
          style={chatStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={chatStyles.headerTitle}>
          {groupMode ? 'New Group' : 'New Chat'}
        </Text>
        
        <TouchableOpacity
          style={chatStyles.toggleButton}
          onPress={toggleGroupMode}
        >
          <Ionicons 
            name={groupMode ? "person-outline" : "people-outline"} 
            size={24} 
            color="#007AFF" 
          />
        </TouchableOpacity>
      </View>

      <SearchBar
        value={searchText}
        onChangeText={handleSearch}
        placeholder={groupMode ? "Search users to add..." : "Search users to chat with..."}
        autoFocus={true}
        onClear={clearSearch}
      />

      {groupMode && selectedUsers.length > 0 && (
        <View style={chatStyles.selectedUsersContainer}>
          <Text style={chatStyles.selectedUsersText}>
            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
          </Text>
          <TouchableOpacity
            style={[
              chatStyles.createGroupButton,
              selectedUsers.length < 2 && chatStyles.createGroupButtonDisabled
            ]}
            onPress={createGroupChat}
            disabled={selectedUsers.length < 2 || creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={chatStyles.createGroupButtonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render selected users preview
  const renderSelectedUsers = () => {
    if (!groupMode || selectedUsers.length === 0) return null;

    return (
      <View style={chatStyles.selectedUsersPreview}>
        <Text style={chatStyles.selectedUsersTitle}>Selected Users:</Text>
        <FlatList
          data={selectedUsers}
          renderItem={({ item }) => (
            <View style={chatStyles.selectedUserChip}>
              <Text style={chatStyles.selectedUserName}>{item.name}</Text>
              <TouchableOpacity
                onPress={() => toggleUserSelection(item)}
                style={chatStyles.removeUserButton}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => `selected-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={chatStyles.selectedUsersChips}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={chatStyles.container}>
      {renderHeader()}
      {renderSelectedUsers()}
      
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => `user-${item.id}`}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredUsers.length === 0 ? chatStyles.emptyListContainer : null
        }
        ItemSeparatorComponent={() => <View style={chatStyles.separator} />}
      />
    </SafeAreaView>
  );
};

export default NewChatScreen;