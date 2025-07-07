# Odoo 18 WebRTC Backend Setup

This document explains how to set up the Odoo backend to support WebRTC calls from the mobile app.

## 1. Create Custom Module

Create a new Odoo module to handle WebRTC integration:

```
addons/
└── mobile_webrtc/
    ├── __init__.py
    ├── __manifest__.py
    ├── models/
    │   ├── __init__.py
    │   ├── discuss_channel.py
    │   └── webrtc_session.py
    └── controllers/
        ├── __init__.py
        └── webrtc_controller.py
```

## 2. Module Manifest

**`__manifest__.py`**:
```python
{
    'name': 'Mobile WebRTC Integration',
    'version': '18.0.1.0.0',
    'category': 'Discuss',
    'summary': 'WebRTC support for mobile applications',
    'description': """
        Enables WebRTC video/audio calling between mobile apps and web clients.
        Provides signaling server functionality and call management.
    """,
    'depends': ['mail', 'bus'],
    'data': [
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'auto_install': False,
    'application': False,
}
```

## 3. WebRTC Session Model

**`models/webrtc_session.py`**:
```python
from odoo import models, fields, api
import json
import logging

_logger = logging.getLogger(__name__)

class WebRTCSession(models.Model):
    _name = 'webrtc.session'
    _description = 'WebRTC Call Session'
    _order = 'create_date desc'

    name = fields.Char('Session Name', required=True)
    channel_id = fields.Many2one('discuss.channel', 'Channel', required=True)
    caller_id = fields.Many2one('res.users', 'Caller', required=True)
    call_type = fields.Selection([
        ('audio', 'Audio Call'),
        ('video', 'Video Call')
    ], 'Call Type', required=True, default='video')
    
    status = fields.Selection([
        ('initiating', 'Initiating'),
        ('ringing', 'Ringing'),
        ('connecting', 'Connecting'),
        ('connected', 'Connected'),
        ('ended', 'Ended')
    ], 'Status', default='initiating')
    
    start_time = fields.Datetime('Start Time', default=fields.Datetime.now)
    end_time = fields.Datetime('End Time')
    duration = fields.Integer('Duration (seconds)', compute='_compute_duration')
    
    # WebRTC signaling data
    offer_sdp = fields.Text('Offer SDP')
    answer_sdp = fields.Text('Answer SDP')
    ice_candidates = fields.Text('ICE Candidates')
    
    @api.depends('start_time', 'end_time')
    def _compute_duration(self):
        for session in self:
            if session.start_time and session.end_time:
                delta = session.end_time - session.start_time
                session.duration = int(delta.total_seconds())
            else:
                session.duration = 0

    def end_call(self):
        """End the WebRTC call session"""
        self.write({
            'status': 'ended',
            'end_time': fields.Datetime.now()
        })
        
        # Notify all channel members
        self.channel_id.message_post(
            body=f"📞 Call ended",
            message_type='notification'
        )
        
        # Send bus notification
        self.env['bus.bus']._sendone(
            f'discuss.channel-{self.channel_id.id}',
            'webrtc_call_ended',
            {
                'session_id': self.id,
                'call_id': f'call-{self.id}',
                'channel_id': self.channel_id.id
            }
        )

    def update_signaling(self, signal_type, signal_data):
        """Update WebRTC signaling data"""
        if signal_type == 'offer':
            self.offer_sdp = json.dumps(signal_data)
        elif signal_type == 'answer':
            self.answer_sdp = json.dumps(signal_data)
        elif signal_type == 'ice_candidate':
            # Append ICE candidate to existing list
            candidates = []
            if self.ice_candidates:
                candidates = json.loads(self.ice_candidates)
            candidates.append(signal_data)
            self.ice_candidates = json.dumps(candidates)
        
        # Broadcast signaling to channel members
        self.env['bus.bus']._sendone(
            f'discuss.channel-{self.channel_id.id}',
            'webrtc_signaling',
            {
                'session_id': self.id,
                'call_id': f'call-{self.id}',
                'signal_type': signal_type,
                'signal_data': signal_data,
                'from_user_id': self.env.user.id
            }
        )
```

## 4. Extended Discuss Channel Model

**`models/discuss_channel.py`**:
```python
from odoo import models, fields, api
import logging

_logger = logging.getLogger(__name__)

class DiscussChannel(models.Model):
    _inherit = 'discuss.channel'

    webrtc_sessions = fields.One2many('webrtc.session', 'channel_id', 'WebRTC Sessions')
    active_webrtc_session = fields.Many2one('webrtc.session', 'Active WebRTC Session')

    def mobile_start_webrtc_call(self, call_type='video'):
        """Start WebRTC call from mobile app"""
        # Create WebRTC session
        session = self.env['webrtc.session'].create({
            'name': f'{call_type.title()} Call - {self.name}',
            'channel_id': self.id,
            'caller_id': self.env.user.id,
            'call_type': call_type,
            'status': 'initiating'
        })
        
        # Update channel active session
        self.active_webrtc_session = session.id
        
        # Send call invitation message
        self.message_post(
            body=f"📞 {call_type.title()} call started by {self.env.user.name}",
            message_type='notification'
        )
        
        # Send bus notification to channel members
        self.env['bus.bus']._sendone(
            f'discuss.channel-{self.id}',
            'webrtc_call_invitation',
            {
                'call_id': f'call-{session.id}',
                'session_id': session.id,
                'channel_id': self.id,
                'caller_id': self.env.user.id,
                'caller_name': self.env.user.name,
                'call_type': call_type,
                'timestamp': fields.Datetime.now().isoformat()
            }
        )
        
        return {
            'call_id': f'call-{session.id}',
            'session_id': session.id,
            'caller_id': self.env.user.id,
            'caller_name': self.env.user.name,
            'status': 'initiating'
        }

    def mobile_end_webrtc_call(self, call_id):
        """End WebRTC call from mobile app"""
        # Extract session ID from call_id
        session_id = int(call_id.replace('call-', ''))
        session = self.env['webrtc.session'].browse(session_id)
        
        if session.exists():
            session.end_call()
            
        # Clear active session
        if self.active_webrtc_session and self.active_webrtc_session.id == session_id:
            self.active_webrtc_session = False
            
        return {'success': True}

    def mobile_webrtc_signal(self, call_id, signal_type, signal_data):
        """Handle WebRTC signaling from mobile app"""
        # Extract session ID from call_id
        session_id = int(call_id.replace('call-', ''))
        session = self.env['webrtc.session'].browse(session_id)
        
        if session.exists():
            session.update_signaling(signal_type, signal_data)
            
        return {'success': True}
```

## 5. Security Configuration

**`security/ir.model.access.csv`**:
```csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_webrtc_session_user,webrtc.session.user,model_webrtc_session,base.group_user,1,1,1,1
```

## 6. Installation Instructions

1. **Copy the module** to your Odoo addons directory
2. **Update the app list**: Go to Apps → Update Apps List
3. **Install the module**: Search for "Mobile WebRTC Integration" and install
4. **Configure permissions**: Ensure users have access to discuss channels

## 7. Testing the Integration

### From Odoo Web Interface:
```javascript
// Test WebRTC call initiation
odoo.rpc('/web/dataset/call_kw/discuss.channel/mobile_start_webrtc_call', {
    model: 'discuss.channel',
    method: 'mobile_start_webrtc_call',
    args: [channel_id],
    kwargs: {call_type: 'video'}
});
```

### From Mobile App:
The mobile app will call these methods through XML-RPC:
- `discuss.channel.mobile_start_webrtc_call`
- `discuss.channel.mobile_end_webrtc_call`
- `discuss.channel.mobile_webrtc_signal`

## 8. Bus Notifications

The system sends these bus notifications:
- `webrtc_call_invitation`: New call invitation
- `webrtc_signaling`: WebRTC signaling data
- `webrtc_call_ended`: Call ended notification

## 9. Troubleshooting

### Common Issues:
1. **Bus service not working**: Ensure longpolling is enabled
2. **Permissions denied**: Check user access rights
3. **Module not loading**: Verify dependencies are installed

### Debug Mode:
Enable debug logging in Odoo configuration:
```ini
[options]
log_level = debug
log_handler = odoo.addons.mobile_webrtc:DEBUG
```

## 10. Production Considerations

1. **STUN/TURN Servers**: Configure proper ICE servers for production
2. **SSL/TLS**: Ensure HTTPS is enabled for WebRTC to work
3. **Firewall**: Open necessary ports for WebRTC traffic
4. **Load Balancing**: Consider WebRTC-aware load balancers

This setup provides a complete WebRTC integration between your Odoo backend and mobile application.
