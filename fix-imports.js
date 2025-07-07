#!/usr/bin/env node

/**
 * Automated Import Fixer
 * Fixes all import issues caused by service renaming
 */

const fs = require('fs');
const path = require('path');

// Define the mapping of old imports to new imports
const importMappings = {
  // Sync Service fixes
  "import { BaseSyncService } from '../models/base/services'": "import { syncService } from '../models/base/services'",
  "import { BaseSyncService } from '../../base/services'": "import { syncService } from '../../base/services'",
  "import { BaseSyncService } from '../../../models/base/services'": "import { syncService } from '../../../models/base/services'",
  
  // Database Service fixes
  "import { BaseDatabaseService } from '../models/base/services'": "import { DatabaseService } from '../models/base/services/BaseDatabaseService'",
  "import { BaseDatabaseService } from '../../base/services'": "import { DatabaseService } from '../../base/services/BaseDatabaseService'",
  "import { BaseDatabaseService } from '../../../models/base/services'": "import { DatabaseService } from '../../../models/base/services/BaseDatabaseService'",
  
  // Usage fixes
  "new BaseSyncService()": "syncService",
  "BaseSyncService.": "syncService.",
  "new BaseDatabaseService()": "new DatabaseService()",
  "BaseDatabaseService.": "DatabaseService.",
};

// Function to recursively find all TypeScript/JavaScript files
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!['node_modules', '.git', '.expo', 'dist', 'build'].includes(file)) {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply all mappings
    for (const [oldImport, newImport] of Object.entries(importMappings)) {
      if (content.includes(oldImport)) {
        content = content.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
        modified = true;
        console.log(`✅ Fixed import in ${filePath}: ${oldImport} -> ${newImport}`);
      }
    }
    
    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🔧 Starting automated import fix...');

const projectRoot = process.cwd();
const files = findFiles(path.join(projectRoot, 'src'));

console.log(`📁 Found ${files.length} files to check`);

let fixedFiles = 0;
files.forEach(file => {
  if (fixImportsInFile(file)) {
    fixedFiles++;
  }
});

console.log(`\n✅ Import fix complete!`);
console.log(`📊 Fixed ${fixedFiles} files out of ${files.length} checked`);
console.log(`🚀 Try running the app again`);
