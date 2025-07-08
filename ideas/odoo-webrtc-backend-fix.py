# Odoo Backend Fix for WebRTC Call Notifications
# Add this to your Odoo custom module

from odoo import models, fields, api
from odoo.exceptions import ValidationError
import json
import logging

_logger = logging.getLogger(__name__)

class DiscussChannelWebRTC(models.Model):
    _inherit = 'discuss.channel'

    # Add WebRTC session tracking
    active_webrtc_session = fields.Many2one('mail.rtc.session', string='Active WebRTC Session')
    
    @api.model
    def mobile_start_webrtc_call(self, channel_id, call_type='video', ice_servers=None):
        """Start WebRTC call from mobile app - creates proper RTC session"""
        
        channel = self.browse(channel_id)
        if not channel.exists():
            raise ValidationError(f"Channel {channel_id} not found")

        _logger.info(f"📞 Mobile WebRTC call starting: Channel {channel_id}, Type: {call_type}")

        try:
            # Create RTC session (this will trigger web notifications)
            rtc_session = self.env['mail.rtc.session'].create({
                'channel_id': channel_id,
                'partner_id': self.env.user.partner_id.id,
                'is_camera_on': call_type == 'video',
                'is_muted': False,
                'is_screen_sharing_on': False,
            })

            # Update channel with active session
            channel.active_webrtc_session = rtc_session.id

            # Send notification message
            channel.message_post(
                body=f"📞 {call_type.title()} call started by {self.env.user.name}",
                message_type='notification',
                subtype_xmlid='mail.mt_comment',
            )

            # Send real-time notification to web clients
            self.env['bus.bus']._sendone(
                f'discuss.channel/{channel_id}',
                'webrtc_call_started',
                {
                    'session_id': rtc_session.id,
                    'caller_id': self.env.user.partner_id.id,
                    'caller_name': self.env.user.name,
                    'call_type': call_type,
                    'channel_id': channel_id,
                }
            )

            _logger.info(f"✅ WebRTC session created: {rtc_session.id}")
            
            return {
                'session_id': rtc_session.id,
                'call_id': f"webrtc_{rtc_session.id}",
                'ice_servers': ice_servers or [
                    {'urls': 'stun:stun.l.google.com:19302'},
                    {'urls': 'stun:stun1.l.google.com:19302'},
                ]
            }

        except Exception as e:
            _logger.error(f"❌ Failed to create WebRTC session: {e}")
            
            # Fallback: Just send chat message
            channel.message_post(
                body=f"📞 {call_type.title()} call started by {self.env.user.name} (fallback mode)",
                message_type='notification',
            )
            
            return {
                'session_id': None,
                'call_id': f"fallback_{channel_id}_{call_type}",
                'error': str(e)
            }

    @api.model
    def mobile_end_webrtc_call(self, session_id=None, channel_id=None):
        """End WebRTC call from mobile app"""
        
        try:
            if session_id:
                session = self.env['mail.rtc.session'].browse(session_id)
                if session.exists():
                    channel_id = session.channel_id.id
                    session.unlink()  # Remove session
                    
                    # Send end call notification
                    self.env['bus.bus']._sendone(
                        f'discuss.channel/{channel_id}',
                        'webrtc_call_ended',
                        {'session_id': session_id}
                    )
                    
                    _logger.info(f"✅ WebRTC session {session_id} ended")
                    return True
                    
            elif channel_id:
                # End any active session in channel
                channel = self.browse(channel_id)
                if channel.active_webrtc_session:
                    session_id = channel.active_webrtc_session.id
                    channel.active_webrtc_session.unlink()
                    channel.active_webrtc_session = False
                    
                    # Send end call notification
                    self.env['bus.bus']._sendone(
                        f'discuss.channel/{channel_id}',
                        'webrtc_call_ended',
                        {'session_id': session_id}
                    )
                    
                    _logger.info(f"✅ WebRTC session ended for channel {channel_id}")
                    return True
                    
        except Exception as e:
            _logger.error(f"❌ Failed to end WebRTC call: {e}")
            
        return False


class MailRTCSession(models.Model):
    _inherit = 'mail.rtc.session'
    
    # Add mobile app support fields
    mobile_call_id = fields.Char(string='Mobile Call ID')
    call_type = fields.Selection([
        ('audio', 'Audio'),
        ('video', 'Video')
    ], string='Call Type', default='video')
    
    @api.model_create_multi
    def create(self, vals_list):
        """Override create to send notifications to web clients"""
        sessions = super().create(vals_list)
        
        for session in sessions:
            # Send real-time notification to web clients
            self.env['bus.bus']._sendone(
                f'discuss.channel/{session.channel_id.id}',
                'rtc_session_created',
                {
                    'session_id': session.id,
                    'partner_id': session.partner_id.id,
                    'partner_name': session.partner_id.name,
                    'is_camera_on': session.is_camera_on,
                    'call_type': getattr(session, 'call_type', 'video'),
                }
            )
            
        return sessions


# JavaScript for Odoo Web Interface
# Add this to your web assets

WEBRTC_JS = """
// Add to your web module's static/src/js/webrtc_notifications.js

odoo.define('your_module.webrtc_notifications', function (require) {
    'use strict';

    var core = require('web.core');
    var session = require('web.session');
    var WebClient = require('web.WebClient');

    WebClient.include({
        start: function () {
            var self = this;
            this._super.apply(this, arguments);
            
            // Listen for WebRTC call notifications
            this.call('bus_service', 'addChannel', 'discuss.channel');
            this.call('bus_service', 'on', 'notification', this, this._onWebRTCNotification);
        },

        _onWebRTCNotification: function (notifications) {
            var self = this;
            _.each(notifications, function (notification) {
                var channel = notification[0];
                var message = notification[1];
                var data = notification[2];

                if (message === 'webrtc_call_started') {
                    self._showIncomingCallNotification(data);
                } else if (message === 'webrtc_call_ended') {
                    self._hideIncomingCallNotification(data);
                }
            });
        },

        _showIncomingCallNotification: function (data) {
            // Show incoming call notification
            var $notification = $('<div class="o_webrtc_call_notification">')
                .html(`
                    <div class="o_call_info">
                        <h4>Incoming ${data.call_type} call</h4>
                        <p>From: ${data.caller_name}</p>
                    </div>
                    <div class="o_call_actions">
                        <button class="btn btn-success o_accept_call" data-session-id="${data.session_id}">
                            Accept
                        </button>
                        <button class="btn btn-danger o_decline_call" data-session-id="${data.session_id}">
                            Decline
                        </button>
                    </div>
                `);

            // Add to page
            $('body').append($notification);

            // Handle accept/decline
            $notification.find('.o_accept_call').click(function () {
                self._acceptWebRTCCall(data.session_id, data.channel_id);
                $notification.remove();
            });

            $notification.find('.o_decline_call').click(function () {
                self._declineWebRTCCall(data.session_id);
                $notification.remove();
            });

            // Auto-remove after 30 seconds
            setTimeout(function () {
                $notification.remove();
            }, 30000);
        },

        _acceptWebRTCCall: function (sessionId, channelId) {
            // Redirect to discuss app with call
            window.location.href = `/web#action=mail.action_discuss&active_id=${channelId}&webrtc_session=${sessionId}`;
        },

        _declineWebRTCCall: function (sessionId) {
            // Call backend to decline
            this._rpc({
                model: 'mail.rtc.session',
                method: 'unlink',
                args: [[sessionId]],
            });
        },
    });
});
"""

# CSS for notifications
WEBRTC_CSS = """
/* Add to your web module's static/src/css/webrtc_notifications.css */

.o_webrtc_call_notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border: 2px solid #007cba;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.o_call_info h4 {
    margin: 0 0 10px 0;
    color: #007cba;
}

.o_call_info p {
    margin: 0 0 15px 0;
    color: #666;
}

.o_call_actions {
    display: flex;
    gap: 10px;
}

.o_call_actions button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}
"""
