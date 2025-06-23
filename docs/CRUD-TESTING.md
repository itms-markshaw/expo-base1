# 🧪 CRUD Testing Guide

This guide explains how to test Create, Read, Update, Delete operations for Users and Contacts in your Odoo sync app.

## 🚀 Quick Start

### 1. Git Commands (Run these first)
```bash
# Make the script executable and run it
chmod +x git-commands.sh
./git-commands.sh
```

Or run manually:
```bash
git init
git add .
git commit -m "🎉 Working Odoo Sync App with CRUD Testing"
git remote add origin https://github.com/itms-markshaw/expo-base1.git
git branch -M main
git push -u origin main
```

### 2. Test CRUD Operations

#### Option A: Mobile App Testing (Recommended)
1. Start the app: `npx expo start`
2. Open the app on your device
3. Login to Odoo
4. Go to the **"Test"** tab
5. Tap **"Run CRUD Tests"**
6. View detailed results

#### Option B: Command Line Testing
```bash
node scripts/test-crud.mjs
```

## 🧪 What Gets Tested

### Users CRUD Operations
- ✅ **READ**: Fetch existing users from Odoo
- ✅ **CREATE**: Create a new test user
- ✅ **UPDATE**: Modify the test user's name
- ✅ **READ**: Verify the update worked
- ✅ **DELETE**: Remove the test user (cleanup)

### Contacts CRUD Operations
- ✅ **READ**: Fetch existing contacts from Odoo
- ✅ **CREATE**: Create a new test contact
- ✅ **UPDATE**: Modify the test contact's details
- ✅ **READ**: Verify the update worked
- ✅ **DELETE**: Remove the test contact (cleanup)

## 📊 Test Results

### Success Indicators
- ✅ All operations complete without errors
- ✅ Created records have valid IDs
- ✅ Updates are reflected when reading back
- ✅ Deletions remove records successfully
- ✅ Performance metrics are reasonable

### What to Look For
- **Response Times**: Should be under 2-3 seconds per operation
- **Error Handling**: Proper error messages for failures
- **Data Integrity**: Updates are saved correctly
- **Cleanup**: Test records are removed after testing

## 🔧 Troubleshooting

### Common Issues

#### Authentication Errors
```
❌ XML-RPC Fault: Access denied
```
**Solution**: Check your API key and permissions in Odoo

#### Permission Errors
```
❌ You don't have access to create users
```
**Solution**: Your Odoo user needs admin rights to create/delete users

#### Network Errors
```
❌ Connection failed: Network request failed
```
**Solution**: Check your Odoo server URL and network connection

#### Database Errors
```
❌ Database 'xyz' doesn't exist
```
**Solution**: Verify the database name in `src/config/odoo.ts`

### Debug Mode
To see detailed XML-RPC communication, check the console logs when running tests.

## 📱 Mobile App Test Screen Features

### Real-time Results
- Live progress updates during testing
- Color-coded success/failure indicators
- Detailed error messages for failures
- Performance timing for each operation

### Test Summary
- Overall pass/fail statistics
- Total execution time
- Success rate percentage
- Individual operation breakdown

### Safety Features
- Automatic cleanup of test records
- Error recovery and rollback
- Non-destructive testing (only creates temporary records)

## 🛡️ Safety Notes

### What This Testing Does
- ✅ Creates temporary test records
- ✅ Tests basic CRUD operations
- ✅ Cleans up after itself
- ✅ Uses safe test data

### What This Testing Does NOT Do
- ❌ Modify existing production data
- ❌ Delete real users or contacts
- ❌ Change system settings
- ❌ Affect other users

### Permissions Required
Your Odoo user needs:
- **Users**: Create, Read, Update, Delete permissions
- **Contacts**: Create, Read, Update, Delete permissions
- **XML-RPC**: API access enabled

## 📈 Performance Benchmarks

### Expected Response Times
- **READ operations**: 200-800ms
- **CREATE operations**: 300-1000ms
- **UPDATE operations**: 200-600ms
- **DELETE operations**: 200-500ms

### Factors Affecting Performance
- Network latency to Odoo server
- Server load and resources
- Database size and complexity
- Number of concurrent users

## 🔄 Continuous Testing

### Automated Testing
You can integrate the command-line test script into your CI/CD pipeline:

```bash
# Add to your build script
npm test:crud || exit 1
```

### Regular Testing Schedule
- **Daily**: Run basic CRUD tests
- **Weekly**: Full integration testing
- **Before deployment**: Complete test suite
- **After Odoo updates**: Compatibility verification

## 📝 Test Data

### Test User Data
```javascript
{
  name: "Test User [timestamp]",
  login: "testuser_[timestamp]@example.com",
  email: "testuser_[timestamp]@example.com",
  password: "testpassword123"
}
```

### Test Contact Data
```javascript
{
  name: "Test Contact [timestamp]",
  email: "testcontact_[timestamp]@example.com",
  phone: "+1234567890",
  is_company: false
}
```

## 🎯 Success Criteria

Your CRUD operations are working correctly if:
- ✅ All tests pass (100% success rate)
- ✅ Response times are reasonable
- ✅ No authentication errors
- ✅ Test records are created and deleted properly
- ✅ Updates are reflected correctly

## 🆘 Getting Help

If tests fail consistently:
1. Check your Odoo server status
2. Verify API credentials
3. Test manual login to Odoo web interface
4. Check network connectivity
5. Review Odoo server logs for errors

## 🎉 Next Steps

Once CRUD testing passes:
1. ✅ Your Odoo integration is working
2. ✅ You can safely sync real data
3. ✅ The app is ready for production use
4. ✅ You can extend with more models/fields

**Congratulations! You have a fully functional Odoo sync app with verified CRUD operations!** 🚀
