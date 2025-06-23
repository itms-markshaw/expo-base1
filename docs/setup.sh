#!/bin/bash

# Odoo Sync App Setup Script
echo "🚀 Setting up Odoo Intelligent Sync App..."
echo "========================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if node_modules was created
if [ ! -d "node_modules" ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Test Odoo connection
echo ""
echo "🔍 Testing Odoo connection..."
if command -v node &> /dev/null; then
    if node scripts/demo-sync.mjs; then
        echo "✅ Odoo connection test successful!"
    else
        echo "⚠️  Odoo connection test failed, but you can still run the app"
        echo "   Check your configuration in src/config/odoo.ts"
    fi
else
    echo "⚠️  Node.js not found, skipping connection test"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🚀 To start the app:"
echo "   npx expo start"
echo ""
echo "📱 Then choose your platform:"
echo "   • Press 'i' for iOS simulator"
echo "   • Press 'a' for Android emulator"  
echo "   • Press 'w' for web browser"
echo "   • Scan QR code with Expo Go app"
echo ""
echo "📚 Read README.md for detailed documentation"
echo ""
