# EAS Build Guide - WebRTC Development

## 🎯 **Build Profiles Available**

Your `eas.json` now includes **4 build profiles**:

### **1. Development (iOS Device)**
```bash
eas build --platform ios --profile development
```
- ✅ **Real WebRTC** with Google STUN servers
- ✅ **Development client** for fast iteration
- ✅ **Install on physical iPhone/iPad**
- ✅ **Full P2P audio/video calling**

### **2. Development Simulator**
```bash
eas build --platform ios --profile development-simulator
```
- ✅ **Real WebRTC** with Google STUN servers
- ✅ **iOS Simulator only** (faster testing)
- ⚠️ **Limited media access** (simulator constraints)
- ✅ **Good for UI/signaling testing**

### **3. Preview**
```bash
eas build --platform ios --profile preview
```
- ✅ **Production-like build**
- ✅ **Internal distribution**
- ✅ **TestFlight alternative**

### **4. Production**
```bash
eas build --platform ios --profile production
```
- ✅ **App Store ready**
- ✅ **Auto-increment version**
- ✅ **Optimized build**

## 🚀 **Recommended Build Strategy for WebRTC Testing**

### **Phase 1: Quick Testing (Simulator)**
```bash
# Fast build for UI and signaling testing
eas build --platform ios --profile development-simulator
```
**Use for:**
- ✅ Testing conditional WebRTC detection
- ✅ UI/UX validation
- ✅ Signaling infrastructure
- ✅ Quick iterations

### **Phase 2: Full Testing (Device)**
```bash
# Full WebRTC testing on real device
eas build --platform ios --profile development
```
**Use for:**
- ✅ Real audio/video calling
- ✅ Google STUN server testing
- ✅ P2P connection validation
- ✅ Performance testing

## 📱 **Installation Instructions**

### **For Simulator Builds:**
1. Build completes → Download `.app` file
2. Drag to iOS Simulator
3. Launch and test

### **For Device Builds:**
1. Build completes → Download `.ipa` file
2. Install via Xcode or Apple Configurator
3. Trust developer certificate in Settings
4. Launch and test

## 🧪 **WebRTC Testing Checklist**

### **In Simulator Build:**
- [ ] App launches without WebRTC errors
- [ ] Shows "Expo Go - RTC Sessions Only" mode
- [ ] Orange 🧪 signaling test works
- [ ] Green 🚀 button shows "not available" message
- [ ] Audio call uses simple fallback mode

### **In Device Build:**
- [ ] App launches with WebRTC support
- [ ] Shows "Development Build - Full WebRTC" mode
- [ ] Orange 🧪 signaling test works
- [ ] Green 🚀 button creates real WebRTC calls
- [ ] Audio call uses real P2P connection
- [ ] Google STUN servers generate ICE candidates
- [ ] Two-way audio works between devices

## ⚡ **Build Time Optimization**

### **Faster Builds:**
- Use `development-simulator` for quick UI testing
- Use `m-medium` resource class (already configured)
- Build during off-peak hours

### **Parallel Testing:**
1. **Simulator build** for rapid UI iteration
2. **Device build** for full WebRTC validation
3. Test both modes simultaneously

## 🔧 **Troubleshooting**

### **Build Fails:**
```bash
# Clear cache and retry
eas build --clear-cache --platform ios --profile development
```

### **WebRTC Not Working:**
1. Check app shows "Development Build" mode
2. Verify microphone permissions granted
3. Test network connectivity to STUN servers
4. Check console logs for WebRTC errors

### **Simulator Limitations:**
- No real microphone/camera access
- Limited WebRTC functionality
- Use for UI testing only

## 🎉 **Success Indicators**

### **Simulator Build Success:**
```
📱 WebRTC Configuration:
   Mode: Expo Go - RTC Sessions Only
   WebRTC Available: false
   Available Features:
     ✅ RTC Session Creation
     ✅ WebRTC Signaling
     ✅ Odoo Web Ringing
```

### **Device Build Success:**
```
📱 WebRTC Configuration:
   Mode: Development Build - Full WebRTC
   WebRTC Available: true
   Available Features:
     ✅ RTC Session Creation
     ✅ WebRTC Signaling
     ✅ Odoo Web Ringing
     ✅ Google STUN Servers
     ✅ P2P Audio Streaming
     ✅ Real WebRTC Calls
     ✅ ICE Candidate Generation
     ✅ Media Device Access
```

## 🚀 **Next Steps After Successful Build**

1. **Test Phase 1-4** with the buttons in chat
2. **Verify Google STUN servers** in logs
3. **Test multi-device calling** between phones
4. **Optimize call quality** settings
5. **Deploy to TestFlight** for broader testing

**Start with the simulator build for quick validation, then move to device build for full WebRTC testing!** 🎯
