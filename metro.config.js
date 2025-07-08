const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add web support and fix import.meta issues
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Fix for import.meta syntax error on web
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Exclude problematic modules from web builds
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add module resolution for web platform
config.resolver.alias = {
  // Provide web-safe fallbacks for native modules
  'react-native-webrtc': require.resolve('./src/utils/webrtc-web-fallback.js'),
};

module.exports = config;
