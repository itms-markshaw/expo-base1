# Odoo WebRTC Debugging Guide

## 1. Check Odoo Logs

Add this to your `odoo.conf`:
```ini
[options]
log_level = debug
log_handler = odoo.addons.mail:DEBUG
```

## 2. Test RTC Session Creation Manually

In Odoo web interface, open Developer Tools → Console and run:

```javascript
// Test if RTC sessions can be created
odoo.__DEBUG__.services['rpc']({
    model: 'mail.rtc.session',
    method: 'create',
    args: [{
        channel_id: 1, // Replace with your channel ID
        partner_id: 2, // Replace with your partner ID
        is_camera_on: true,
        is_muted: false,
        is_screen_sharing_on: false,
    }]
}).then(result => {
    console.log('✅ RTC Session created:', result);
}).catch(error => {
    console.error('❌ RTC Session failed:', error);
});
```

## 3. Check Channel Permissions

Make sure your user has access to the channel:

```javascript
// Check channel access
odoo.__DEBUG__.services['rpc']({
    model: 'discuss.channel',
    method: 'search_read',
    args: [[], ['id', 'name', 'channel_type']]
}).then(channels => {
    console.log('Available channels:', channels);
});
```

## 4. Monitor Bus Messages

Open browser Developer Tools → Network tab and look for:
- `/longpolling/poll` requests
- WebSocket connections
- Bus notifications

## 5. Check WebRTC Configuration

In Odoo Settings → Discuss:
1. **Enable ICE servers** (check the box)
2. **Add STUN servers** if needed:
   ```
   stun:stun.l.google.com:19302
   stun:stun1.l.google.com:19302
   ```

## 6. Test Mobile App RTC Creation

Add this debug code to your mobile app:

```typescript
// In CallService.ts, add this test method
async testRTCCreation(channelId: number): Promise<void> {
  try {
    const client = authService.getClient();
    if (!client) throw new Error('No client');

    console.log('🧪 Testing RTC session creation...');
    
    // Get current user info
    const userInfo = await client.callModel('res.users', 'read', [client.uid], {
      fields: ['id', 'name', 'partner_id']
    });
    console.log('👤 User info:', userInfo);

    // Test channel access
    const channelInfo = await client.callModel('discuss.channel', 'read', [channelId], {
      fields: ['id', 'name', 'channel_type', 'channel_member_ids']
    });
    console.log('💬 Channel info:', channelInfo);

    // Test RTC session creation
    const sessionData = await client.callModel('mail.rtc.session', 'create', [{
      channel_id: channelId,
      partner_id: userInfo[0].partner_id[0],
      is_camera_on: true,
      is_muted: false,
      is_screen_sharing_on: false,
    }]);
    
    console.log('✅ RTC Session test successful:', sessionData);
    
    // Clean up test session
    await client.callModel('mail.rtc.session', 'unlink', [sessionData]);
    console.log('🧹 Test session cleaned up');

  } catch (error) {
    console.error('❌ RTC test failed:', error);
  }
}
```

## 7. Common Issues & Solutions

### Issue: "mail.rtc.session model not found"
**Solution:** Your Odoo version might not have RTC support. Check:
```bash
# In Odoo shell
./odoo-bin shell -d your_database
>>> env['ir.model'].search([('model', 'like', 'rtc')])
```

### Issue: "Access denied"
**Solution:** User needs proper permissions:
```python
# Add to user groups
user.groups_id = [(4, ref('base.group_user').id)]
```

### Issue: "Channel not found"
**Solution:** Make sure user is member of the channel:
```python
# Check channel membership
channel = env['discuss.channel'].browse(channel_id)
if env.user.partner_id not in channel.channel_member_ids.mapped('partner_id'):
    # Add user to channel
    channel.add_members(env.user.partner_id.ids)
```

## 8. Alternative: Custom WebRTC Integration

If standard RTC doesn't work, create custom integration:

```python
# In your custom module
class DiscussChannelCustomRTC(models.Model):
    _inherit = 'discuss.channel'
    
    @api.model
    def mobile_call_notification(self, channel_id, call_type='video', caller_name='Mobile User'):
        """Send call notification to web clients"""
        
        # Send bus notification
        self.env['bus.bus']._sendone(
            f'discuss.channel/{channel_id}',
            'mobile_call_started',
            {
                'channel_id': channel_id,
                'call_type': call_type,
                'caller_name': caller_name,
                'timestamp': fields.Datetime.now().isoformat(),
            }
        )
        
        # Also send chat message
        self.browse(channel_id).message_post(
            body=f"📞 {call_type.title()} call from {caller_name}",
            message_type='notification'
        )
        
        return True
```

Then update your mobile app to use this:

```typescript
// In CallService.ts
await client.callModel('discuss.channel', 'mobile_call_notification', [], {
  channel_id: channelId,
  call_type: isVideo ? 'video' : 'audio',
  caller_name: client.username || 'Mobile User',
});
```
