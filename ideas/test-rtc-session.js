// Test RTC Session Creation in Odoo Web Console
// Open Odoo web → Developer Tools → Console → Paste this code

console.log('🧪 Testing RTC Session Creation...');

// Test 1: Check if RTC models exist
async function testRTCModels() {
    try {
        // Check discuss.channel.rtc.session model
        const rtcSessions = await odoo.__DEBUG__.services['rpc']({
            model: 'discuss.channel.rtc.session',
            method: 'search_read',
            args: [[], ['id', 'channel_id', 'partner_id', 'is_camera_on']]
        });
        console.log('✅ RTC Sessions found:', rtcSessions);
        
        // Check available channels
        const channels = await odoo.__DEBUG__.services['rpc']({
            model: 'discuss.channel',
            method: 'search_read',
            args: [[], ['id', 'name', 'channel_type']]
        });
        console.log('✅ Available channels:', channels);
        
        return { rtcSessions, channels };
        
    } catch (error) {
        console.error('❌ RTC model test failed:', error);
        return null;
    }
}

// Test 2: Create RTC session manually
async function createTestRTCSession(channelId = 105) {
    try {
        console.log(`🧪 Creating test RTC session for channel ${channelId}...`);
        
        // Get current user info
        const userInfo = await odoo.__DEBUG__.services['rpc']({
            model: 'res.users',
            method: 'read',
            args: [odoo.session.uid],
            kwargs: { fields: ['id', 'name', 'partner_id'] }
        });
        console.log('👤 Current user:', userInfo);
        
        // Try Method 1: rtc_join_call
        try {
            const joinResult = await odoo.__DEBUG__.services['rpc']({
                model: 'discuss.channel',
                method: 'rtc_join_call',
                args: [channelId],
                kwargs: { check_rtc_session_ids: [] }
            });
            console.log('✅ RTC join successful:', joinResult);
            return joinResult;
            
        } catch (joinError) {
            console.log('⚠️ RTC join failed, trying direct creation:', joinError);
            
            // Try Method 2: Direct session creation
            const sessionData = await odoo.__DEBUG__.services['rpc']({
                model: 'discuss.channel.rtc.session',
                method: 'create',
                args: [{
                    channel_id: channelId,
                    partner_id: userInfo[0].partner_id[0],
                    is_camera_on: true,
                    is_muted: false,
                    is_screen_sharing_on: false,
                }]
            });
            console.log('✅ Direct RTC session created:', sessionData);
            return sessionData;
        }
        
    } catch (error) {
        console.error('❌ RTC session creation failed:', error);
        return null;
    }
}

// Test 3: Monitor bus notifications
function monitorBusNotifications() {
    console.log('👂 Monitoring bus notifications...');
    
    // Hook into bus service if available
    if (odoo.__DEBUG__.services && odoo.__DEBUG__.services['bus_service']) {
        const originalTrigger = odoo.__DEBUG__.services['bus_service'].trigger;
        odoo.__DEBUG__.services['bus_service'].trigger = function(eventName, ...args) {
            if (eventName.includes('rtc') || eventName.includes('call')) {
                console.log('🚌 RTC Bus notification:', eventName, args);
            }
            return originalTrigger.apply(this, arguments);
        };
        console.log('✅ Bus monitoring enabled');
    } else {
        console.log('⚠️ Bus service not available for monitoring');
    }
}

// Test 4: Check WebRTC configuration
async function checkWebRTCConfig() {
    try {
        const config = await odoo.__DEBUG__.services['rpc']({
            model: 'ir.config_parameter',
            method: 'search_read',
            args: [[['key', 'like', 'discuss']]],
            kwargs: { fields: ['key', 'value'] }
        });
        console.log('⚙️ Discuss configuration:', config);
        
        // Check ICE servers
        const iceConfig = config.find(c => c.key.includes('ice'));
        if (iceConfig) {
            console.log('🧊 ICE servers configured:', iceConfig.value);
        } else {
            console.log('⚠️ No ICE servers configured');
        }
        
    } catch (error) {
        console.error('❌ Config check failed:', error);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting comprehensive RTC tests...');
    
    // Test 1: Check models
    const modelTest = await testRTCModels();
    
    // Test 2: Check config
    await checkWebRTCConfig();
    
    // Test 3: Monitor notifications
    monitorBusNotifications();
    
    // Test 4: Create test session (replace 105 with your channel ID)
    if (modelTest && modelTest.channels.length > 0) {
        const testChannelId = modelTest.channels[0].id;
        console.log(`🧪 Using channel ${testChannelId} for test...`);
        
        const sessionResult = await createTestRTCSession(testChannelId);
        
        if (sessionResult) {
            console.log('🎉 RTC session test completed successfully!');
            console.log('💡 Now try your mobile app - it should work!');
        }
    }
}

// Execute tests
runAllTests();

// Helper: Clean up test sessions
async function cleanupTestSessions() {
    try {
        const sessions = await odoo.__DEBUG__.services['rpc']({
            model: 'discuss.channel.rtc.session',
            method: 'search',
            args: [[]]
        });
        
        if (sessions.length > 0) {
            await odoo.__DEBUG__.services['rpc']({
                model: 'discuss.channel.rtc.session',
                method: 'unlink',
                args: [sessions]
            });
            console.log(`🧹 Cleaned up ${sessions.length} test sessions`);
        }
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
}

// Make cleanup available globally
window.cleanupRTCTests = cleanupTestSessions;
console.log('💡 Run cleanupRTCTests() to clean up test sessions');
