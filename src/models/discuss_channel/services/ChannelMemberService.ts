/**
 * ChannelMemberService - Service for managing discuss.channel.member operations
 * Handles channel membership, fold states, and visibility settings
 */

import { authService } from '../../base/services/BaseAuthService';
import { syncService } from '../../base/services/BaseSyncService';

export interface ChannelMember {
  id: number;
  partner_id: number;
  guest_id?: number;
  channel_id: number;
  fold_state: 'open' | 'folded' | 'closed';
  last_interest_dt?: string;
  last_seen_dt?: string;
  custom_channel_name?: string;
  custom_notifications?: boolean;
  mute_until_dt?: string;
  unpin_dt?: string;
  is_pinned?: boolean;
  new_message_separator?: number;
}

export type FoldState = 'open' | 'folded' | 'closed';

class ChannelMemberService {
  private currentUserPartnerId: number | null = null;

  constructor() {
    this.initializeCurrentUser();
  }

  /**
   * Initialize current user partner ID
   */
  private async initializeCurrentUser(): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      const currentUser = await client.searchRead('res.users',
        [['id', '=', client.uid]],
        ['partner_id']
      );

      if (currentUser.length > 0) {
        let partnerId = currentUser[0].partner_id;

        // Handle different partner_id formats
        if (Array.isArray(partnerId) && partnerId.length > 0) {
          this.currentUserPartnerId = partnerId[0];
        } else if (typeof partnerId === 'number') {
          this.currentUserPartnerId = partnerId;
        } else if (typeof partnerId === 'string') {
          const match = partnerId.match(/<value><int>(\d+)<\/int>/);
          if (match) {
            this.currentUserPartnerId = parseInt(match[1]);
          }
        }

        console.log(`👤 ChannelMemberService initialized with partner ID: ${this.currentUserPartnerId}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize current user partner ID:', error);
    }
  }

  /**
   * Get current user's partner ID
   */
  async getCurrentUserPartnerId(): Promise<number | null> {
    if (!this.currentUserPartnerId) {
      await this.initializeCurrentUser();
    }
    return this.currentUserPartnerId;
  }

  /**
   * Get channel membership for current user
   */
  async getChannelMembership(channelId: number): Promise<ChannelMember | null> {
    try {
      const partnerId = await this.getCurrentUserPartnerId();
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      const memberships = await client.searchRead('discuss.channel.member',
        [
          ['channel_id', '=', channelId],
          ['partner_id', '=', partnerId]
        ],
        [
          'id', 'partner_id', 'guest_id', 'channel_id', 'fold_state',
          'last_interest_dt', 'last_seen_dt', 'custom_channel_name',
          'custom_notifications', 'mute_until_dt', 'unpin_dt',
          'new_message_separator'
        ]
      );

      if (memberships.length > 0) {
        const membership = memberships[0];
        return {
          ...membership,
          is_pinned: !membership.unpin_dt
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get channel membership:', error);
      return null;
    }
  }

  /**
   * Update channel fold state for current user
   */
  async updateChannelFoldState(channelId: number, foldState: FoldState): Promise<boolean> {
    try {
      const partnerId = await this.getCurrentUserPartnerId();
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      console.log(`🔄 Updating fold state for channel ${channelId} to "${foldState}" for partner ${partnerId}`);

      // Find the membership record
      const memberIds = await client.search('discuss.channel.member', [
        ['channel_id', '=', channelId],
        ['partner_id', '=', partnerId]
      ]);

      if (memberIds.length === 0) {
        throw new Error(`No membership found for channel ${channelId} and partner ${partnerId}`);
      }

      // Update the fold state
      await client.write('discuss.channel.member', memberIds, {
        fold_state: foldState
      });

      console.log(`✅ Successfully updated fold state for channel ${channelId} to "${foldState}"`);

      // Update local cache if available
      try {
        const cachedMembers = await syncService.getCachedData('discuss.channel.member');
        if (cachedMembers && cachedMembers.length > 0) {
          const updatedMembers = cachedMembers.map(member => {
            if (member.channel_id === channelId && member.partner_id === partnerId) {
              return { ...member, fold_state: foldState };
            }
            return member;
          });
          
          // Save updated cache (if sync service supports it)
          // This is optional - the next sync will update the cache anyway
        }
      } catch (cacheError) {
        console.warn('⚠️ Failed to update cached membership data:', cacheError);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to update channel fold state:', error);
      return false;
    }
  }

  /**
   * Unfold/Reopen a channel (set fold_state to 'open')
   */
  async unfoldChannel(channelId: number): Promise<boolean> {
    return this.updateChannelFoldState(channelId, 'open');
  }

  /**
   * Fold a channel (set fold_state to 'folded')
   */
  async foldChannel(channelId: number): Promise<boolean> {
    return this.updateChannelFoldState(channelId, 'folded');
  }

  /**
   * Close/Hide a channel (set fold_state to 'closed')
   */
  async closeChannel(channelId: number): Promise<boolean> {
    return this.updateChannelFoldState(channelId, 'closed');
  }

  /**
   * Get all channel memberships for current user
   */
  async getCurrentUserMemberships(): Promise<ChannelMember[]> {
    try {
      const partnerId = await this.getCurrentUserPartnerId();
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      const client = authService.getClient();
      if (!client) {
        // Try to get from cache if no client available
        const cachedMembers = await syncService.getCachedData('discuss.channel.member');
        if (cachedMembers) {
          return cachedMembers.filter(member => member.partner_id === partnerId);
        }
        throw new Error('No authenticated client available and no cached data');
      }

      const memberships = await client.searchRead('discuss.channel.member',
        [['partner_id', '=', partnerId]],
        [
          'id', 'partner_id', 'guest_id', 'channel_id', 'fold_state',
          'last_interest_dt', 'last_seen_dt', 'custom_channel_name',
          'custom_notifications', 'mute_until_dt', 'unpin_dt',
          'new_message_separator'
        ]
      );

      return memberships.map(membership => ({
        ...membership,
        is_pinned: !membership.unpin_dt
      }));
    } catch (error) {
      console.error('❌ Failed to get current user memberships:', error);
      return [];
    }
  }

  /**
   * Get visible channels (not closed) for current user
   */
  async getVisibleChannels(): Promise<number[]> {
    try {
      const memberships = await this.getCurrentUserMemberships();
      return memberships
        .filter(member => member.fold_state !== 'closed')
        .map(member => member.channel_id);
    } catch (error) {
      console.error('❌ Failed to get visible channels:', error);
      return [];
    }
  }

  /**
   * Get channels grouped by fold state
   */
  async getChannelsByFoldState(): Promise<{
    open: number[];
    folded: number[];
    closed: number[];
  }> {
    try {
      const memberships = await this.getCurrentUserMemberships();
      
      const result = {
        open: [] as number[],
        folded: [] as number[],
        closed: [] as number[]
      };

      memberships.forEach(member => {
        const state = member.fold_state || 'open';
        if (result[state]) {
          result[state].push(member.channel_id);
        }
      });

      return result;
    } catch (error) {
      console.error('❌ Failed to get channels by fold state:', error);
      return { open: [], folded: [], closed: [] };
    }
  }

  /**
   * Bulk update fold states for multiple channels
   */
  async bulkUpdateFoldStates(channelStates: { channelId: number; foldState: FoldState }[]): Promise<boolean> {
    try {
      const partnerId = await this.getCurrentUserPartnerId();
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      console.log(`🔄 Bulk updating fold states for ${channelStates.length} channels`);

      // Process each channel update
      for (const { channelId, foldState } of channelStates) {
        try {
          await this.updateChannelFoldState(channelId, foldState);
        } catch (error) {
          console.error(`❌ Failed to update fold state for channel ${channelId}:`, error);
        }
      }

      console.log(`✅ Bulk update completed for ${channelStates.length} channels`);
      return true;
    } catch (error) {
      console.error('❌ Failed to bulk update fold states:', error);
      return false;
    }
  }

  /**
   * Pin a channel (clear unpin_dt)
   */
  async pinChannel(channelId: number): Promise<boolean> {
    try {
      const partnerId = await this.getCurrentUserPartnerId();
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      const memberIds = await client.search('discuss.channel.member', [
        ['channel_id', '=', channelId],
        ['partner_id', '=', partnerId]
      ]);

      if (memberIds.length === 0) {
        throw new Error(`No membership found for channel ${channelId}`);
      }

      await client.write('discuss.channel.member', memberIds, {
        unpin_dt: false // Clear unpin date to pin the channel
      });

      console.log(`📌 Pinned channel ${channelId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to pin channel:', error);
      return false;
    }
  }

  /**
   * Unpin a channel (set unpin_dt to current time)
   */
  async unpinChannel(channelId: number): Promise<boolean> {
    try {
      const partnerId = await this.getCurrentUserPartnerId();
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      const memberIds = await client.search('discuss.channel.member', [
        ['channel_id', '=', channelId],
        ['partner_id', '=', partnerId]
      ]);

      if (memberIds.length === 0) {
        throw new Error(`No membership found for channel ${channelId}`);
      }

      await client.write('discuss.channel.member', memberIds, {
        unpin_dt: new Date().toISOString()
      });

      console.log(`📌 Unpinned channel ${channelId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to unpin channel:', error);
      return false;
    }
  }

  /**
   * Update custom channel name
   */
  async updateCustomChannelName(channelId: number, customName: string): Promise<boolean> {
    try {
      const partnerId = await this.getCurrentUserPartnerId();
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      const memberIds = await client.search('discuss.channel.member', [
        ['channel_id', '=', channelId],
        ['partner_id', '=', partnerId]
      ]);

      if (memberIds.length === 0) {
        throw new Error(`No membership found for channel ${channelId}`);
      }

      await client.write('discuss.channel.member', memberIds, {
        custom_channel_name: customName || false
      });

      console.log(`✏️ Updated custom name for channel ${channelId}: "${customName}"`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update custom channel name:', error);
      return false;
    }
  }

  /**
   * Mark channel as seen (update last_seen_dt)
   */
  async markChannelAsSeen(channelId: number): Promise<boolean> {
    try {
      const partnerId = await this.getCurrentUserPartnerId();
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      const memberIds = await client.search('discuss.channel.member', [
        ['channel_id', '=', channelId],
        ['partner_id', '=', partnerId]
      ]);

      if (memberIds.length === 0) {
        throw new Error(`No membership found for channel ${channelId}`);
      }

      await client.write('discuss.channel.member', memberIds, {
        last_seen_dt: new Date().toISOString()
      });

      console.log(`👁️ Marked channel ${channelId} as seen`);
      return true;
    } catch (error) {
      console.error('❌ Failed to mark channel as seen:', error);
      return false;
    }
  }
}

// Create singleton instance
export const channelMemberService = new ChannelMemberService();
export default channelMemberService;
