#!/usr/bin/env node

/**
 * Fix false positive conflicts caused by data type comparison issues
 */

import { conflictResolutionService } from '../src/services/conflictResolution.ts';
import { databaseService } from '../src/services/database.ts';

async function fixConflicts() {
  try {
    console.log('🔧 Starting conflict resolution fix...');

    // Initialize database
    await databaseService.initialize();
    console.log('✅ Database initialized');

    // Initialize conflict resolution service
    await conflictResolutionService.initialize();
    console.log('✅ Conflict resolution service initialized');

    // Get current conflict count
    const allConflicts = await conflictResolutionService.getAllConflicts();
    console.log(`📊 Found ${allConflicts.length} pending conflicts`);

    if (allConflicts.length === 0) {
      console.log('✅ No conflicts to fix');
      return;
    }

    // Show sample conflict for debugging
    if (allConflicts.length > 0) {
      const sample = allConflicts[0];
      console.log('\n📄 Sample conflict:');
      console.log(`   Model: ${sample.modelName}`);
      console.log(`   Record ID: ${sample.recordId}`);
      console.log(`   Conflicting fields: ${sample.conflictFields.join(', ')}`);
      
      // Show the actual values causing conflict
      for (const field of sample.conflictFields) {
        const localVal = sample.localData[field];
        const serverVal = sample.serverData[field];
        console.log(`   ${field}: Local="${localVal}" (${typeof localVal}) vs Server="${serverVal}" (${typeof serverVal})`);
      }
    }

    // Clear false positive conflicts
    const clearedCount = await conflictResolutionService.clearFalsePositiveConflicts();
    
    // Get updated conflict count
    const remainingConflicts = await conflictResolutionService.getAllConflicts();
    
    console.log('\n📊 Results:');
    console.log(`   ✅ Cleared: ${clearedCount} false positive conflicts`);
    console.log(`   ⚠️ Remaining: ${remainingConflicts.length} actual conflicts`);

    if (remainingConflicts.length > 0) {
      console.log('\n📋 Remaining conflicts:');
      remainingConflicts.forEach((conflict, index) => {
        console.log(`   ${index + 1}. ${conflict.modelName} record ${conflict.recordId}: ${conflict.conflictFields.join(', ')}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to fix conflicts:', error);
    process.exit(1);
  }
}

// Run the fix
fixConflicts().then(() => {
  console.log('✅ Conflict fix completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Conflict fix failed:', error);
  process.exit(1);
});
