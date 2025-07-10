/**
 * BC-H151_useChannelList.ts - Custom Hook for Channel List Management
 * 
 * Handles:
 * - Channel loading (cache + fresh data)
 * - Channel filtering (open/closed channels)
 * - Channel fold state management
 * - Real-time channel updates
 * - Loading states and error handling
 * 
 * Usage:
 * const { 
 *   channels, 
 *   loading, 
 *   refreshing, 
 *   showClosedChannels,
 *   toggleShowClosedChannels,
 *   foldChannel,
 *   refreshChannels 
 * } = useChannelList();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '../../discuss_channel/services/ChatService';
import { channelMemberService } from '../../discuss_channel/services/ChannelMemberService';
import { ChatChannel } from '../../discuss_channel/types/ChatTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChannelFilters } from '../components/BC-C155_ChannelFilterSheet';

interface UseChannelListReturn {
  // Data
  channels: ChatChannel[];
  allChannels: ChatChannel[];
  groupedChannels: { [key: string]: ChatChannel[] };

  // Loading states
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  // Filters
  filters: ChannelFilters;
  updateFilters: (filters: ChannelFilters) => void;

  // Legacy support
  showClosedChannels: boolean;
  toggleShowClosedChannels: (show: boolean) => void;

  // Actions
  foldChannel: (channel: ChatChannel) => Promise<void>;
  refreshChannels: () => Promise<void>;
  selectChannel: (channel: ChatChannel) => void;
}

const DEFAULT_FILTERS: ChannelFilters = {
  groupBy: 'type',
  sortBy: 'activity',
  sortOrder: 'desc',
  showDirectMessages: true,
  showChannels: true,
  showClosedChannels: false,
  showFoldedChannels: false,
  showEmptyChannels: true,
  showArchivedChannels: false,
};

export function useChannelList(): UseChannelListReturn {
  // State
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [allChannels, setAllChannels] = useState<ChatChannel[]>([]);
  const [groupedChannels, setGroupedChannels] = useState<{ [key: string]: ChatChannel[] }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ChannelFilters>(DEFAULT_FILTERS);

  // Legacy support
  const showClosedChannels = filters.showClosedChannels;

  // Refs
  const isInitialized = useRef(false);

  // Initialize on mount
  useEffect(() => {
    if (!isInitialized.current) {
      initializeChannelList();
      isInitialized.current = true;
    }

    return () => {
      cleanupEventListeners();
    };
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Re-filter when filters change
  useEffect(() => {
    if (allChannels.length > 0) {
      applyFiltersAndGrouping(allChannels);
    }
  }, [filters]);

  // Save filters when they change
  useEffect(() => {
    saveFilters();
  }, [filters]);

  const initializeChannelList = async () => {
    try {
      console.log('🔧 Initializing channel list hook...');
      
      // Initialize chat service
      await chatService.initialize();
      
      // Setup event listeners
      setupEventListeners();
      
      // Load initial data
      await loadChannels(true);
      
    } catch (error) {
      console.error('Failed to initialize channel list:', error);
      setError('Failed to load channels. Please try again.');
    }
  };

  const setupEventListeners = () => {
    console.log('🔗 Setting up channel list event listeners');
    
    chatService.on('channelsLoaded', handleChannelsLoaded);
    chatService.on('connectionChanged', handleConnectionChanged);
  };

  const cleanupEventListeners = () => {
    console.log('🔗 Cleaning up channel list event listeners');
    
    chatService.off('channelsLoaded', handleChannelsLoaded);
    chatService.off('connectionChanged', handleConnectionChanged);
  };

  const loadSettings = async () => {
    try {
      const savedFilters = await AsyncStorage.getItem('channel_list_filters');
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters({ ...DEFAULT_FILTERS, ...parsedFilters });
      }
    } catch (error) {
      console.warn('Failed to load channel list settings:', error);
    }
  };

  const saveFilters = async () => {
    try {
      await AsyncStorage.setItem('channel_list_filters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save channel filters:', error);
    }
  };

  const handleChannelsLoaded = async (loadedChannels: ChatChannel[]) => {
    console.log(`📱 Hook: Loaded ${loadedChannels.length} channels`);

    // Store all channels
    setAllChannels(loadedChannels);

    // Apply filtering and grouping
    await applyFiltersAndGrouping(loadedChannels);

    // Clear error state
    setError(null);
  };

  const handleConnectionChanged = (status: 'connected' | 'connecting' | 'disconnected') => {
    console.log(`📱 Hook: Connection status changed to ${status}`);
    // Could update UI to show connection status
  };

  const applyFiltersAndGrouping = async (channelsToFilter: ChatChannel[]) => {
    try {
      console.log(`📱 Hook: Applying filters to ${channelsToFilter.length} channels`);

      // Step 1: Filter channels based on visibility settings
      let filteredChannels = channelsToFilter.filter(channel => {
        // Filter by channel type
        if (channel.channel_type === 'chat' && !filters.showDirectMessages) return false;
        if (channel.channel_type === 'channel' && !filters.showChannels) return false;

        // Filter by status (simplified for now)
        if (!filters.showClosedChannels) {
          const channelsToHide = ['411-a', '411'];
          if (channelsToHide.includes(channel.name) ||
              channel.name?.includes('test-') ||
              (channel.channel_type === 'channel' && channel.name?.startsWith('411'))) {
            return false;
          }
        }

        // Filter empty channels
        if (!filters.showEmptyChannels && (channel.member_count || 0) === 0) return false;

        return true;
      });

      // Step 2: Sort channels
      filteredChannels = sortChannels(filteredChannels);

      // Step 3: Group channels if needed
      const grouped = groupChannels(filteredChannels);

      // Update state
      setChannels(filteredChannels);
      setGroupedChannels(grouped);

      console.log(`📱 Hook: Filtered to ${filteredChannels.length} channels, grouped into ${Object.keys(grouped).length} groups`);

    } catch (error) {
      console.warn('Failed to apply filters:', error);
      setChannels(channelsToFilter);
      setGroupedChannels({ 'All Channels': channelsToFilter });
    }
  };

  const sortChannels = (channelsToSort: ChatChannel[]): ChatChannel[] => {
    return [...channelsToSort].sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'activity':
          // Sort by last message date (mock for now)
          comparison = (b.id - a.id); // Newer channels first as proxy
          break;
        case 'members':
          comparison = (b.member_count || 0) - (a.member_count || 0);
          break;
        case 'unread':
          // Mock unread count for now
          comparison = 0;
          break;
        default:
          comparison = 0;
      }

      return filters.sortOrder === 'desc' ? comparison : -comparison;
    });
  };

  const groupChannels = (channelsToGroup: ChatChannel[]): { [key: string]: ChatChannel[] } => {
    if (filters.groupBy === 'none') {
      return { 'All Channels': channelsToGroup };
    }

    const groups: { [key: string]: ChatChannel[] } = {};

    channelsToGroup.forEach(channel => {
      let groupKey = '';

      switch (filters.groupBy) {
        case 'type':
          groupKey = channel.channel_type === 'chat' ? 'Direct Messages' : 'Channels';
          break;
        case 'status':
          // Simplified status grouping
          const isHidden = ['411-a', '411'].includes(channel.name) ||
                          channel.name?.includes('test-');
          groupKey = isHidden ? 'Hidden' : 'Active';
          break;
        default:
          groupKey = 'All Channels';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(channel);
    });

    return groups;
  };

  const loadChannels = async (initial: boolean = false) => {
    try {
      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Get current channels from service (they're already loaded during initialization)
      const currentChannels = chatService.getChannels();
      await handleChannelsLoaded(currentChannels);

    } catch (error) {
      console.error('Failed to load channels:', error);
      setError('Failed to load channels. Please try again.');
    } finally {
      if (initial) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const updateFilters = useCallback((newFilters: ChannelFilters) => {
    console.log('📱 Hook: Updating filters:', newFilters);
    setFilters(newFilters);
  }, []);

  const toggleShowClosedChannels = useCallback((show: boolean) => {
    updateFilters({ ...filters, showClosedChannels: show });
    console.log(`📱 Hook: Show closed channels toggled to: ${show}`);
  }, [filters, updateFilters]);

  const foldChannel = useCallback(async (channel: ChatChannel) => {
    try {
      console.log(`📱 Hook: Folding channel ${channel.name} (ID: ${channel.id})`);
      
      // Get current user's partner ID
      const client = chatService.getAuthenticatedClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      // Call Odoo to update fold state
      const partnerId = await client.call('res.users', 'read', [[(client as any).uid], ['partner_id']]);
      const partnerIdValue = partnerId[0]?.partner_id?.[0];

      if (!partnerIdValue) {
        throw new Error('Could not get current user partner ID');
      }

      // Find and update the channel membership
      const membershipIds = await client.callModel('discuss.channel.member', 'search', [
        [['channel_id', '=', channel.id], ['partner_id', '=', partnerIdValue]]
      ]);

      if (membershipIds && membershipIds.length > 0) {
        await client.callModel('discuss.channel.member', 'write', [membershipIds, {
          fold_state: 'closed'
        }]);
        console.log(`✅ Hook: Successfully folded channel ${channel.name}`);
        
        // Refresh channels to reflect the change
        await refreshChannels();
      } else {
        console.log('⚠️ Hook: No membership found to update');
      }

    } catch (error) {
      console.error('❌ Hook: Failed to fold channel:', error);
      throw error; // Re-throw so UI can handle it
    }
  }, []);

  const refreshChannels = useCallback(async () => {
    console.log('🔄 Hook: Refreshing channels...');
    await loadChannels(false);
  }, []);

  const selectChannel = useCallback((channel: ChatChannel) => {
    console.log(`📱 Hook: Channel selected: ${channel.name} (ID: ${channel.id})`);
    // This hook doesn't handle navigation - that's the screen's responsibility
    // But we could emit an event or call a callback if needed
  }, []);

  return {
    // Data
    channels,
    allChannels,
    groupedChannels,

    // Loading states
    loading,
    refreshing,
    error,

    // Filters
    filters,
    updateFilters,

    // Legacy support
    showClosedChannels,
    toggleShowClosedChannels,

    // Actions
    foldChannel,
    refreshChannels,
    selectChannel,
  };
}
