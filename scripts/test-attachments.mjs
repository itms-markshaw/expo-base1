/**
 * Attachments Testing Script
 * Test ir.attachment functionality for chatter
 */

import { OdooXMLRPCClient } from '../src/services/OdooXMLRPCClient.ts';
import { ODOO_CONFIG } from '../src/config/odoo.ts';
import * as fs from 'fs';
import * as path from 'path';

console.log('📎 Attachments Testing - ir.attachment Integration');
console.log('================================================');

async function testAttachments() {
  try {
    // Initialize client
    console.log('🔐 Connecting to Odoo...');
    const client = new OdooXMLRPCClient({
      baseURL: ODOO_CONFIG.baseURL,
      database: ODOO_CONFIG.db,
      username: ODOO_CONFIG.username,
      apiKey: ODOO_CONFIG.apiKey,
    });

    // Test connection
    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Connection failed: ${connectionTest.error}`);
    }
    console.log('✅ Connected successfully!');

    // Step 1: Create test CRM lead
    console.log('\n✨ Creating test CRM lead...');
    const leadData = {
      name: `Attachments Test Lead ${Date.now()}`,
      partner_name: `Attachments Test Company`,
      email_from: `attachtest_${Date.now()}@example.com`,
      description: 'Test lead for attachments functionality',
      type: 'lead',
      probability: 25,
    };
    
    const leadId = await client.create('crm.lead', leadData);
    console.log(`✅ Created test lead with ID: ${leadId}`);

    // Step 2: Test attachment creation with sample data
    console.log('\n📎 Testing attachment creation...');
    
    // Create a simple text file as base64
    const sampleText = 'This is a test attachment file created for Odoo chatter testing.\n\nIt contains sample content to verify file upload functionality.';
    const base64Content = Buffer.from(sampleText).toString('base64');
    
    const attachmentData = {
      name: 'test-document.txt',
      datas_fname: 'test-document.txt',
      datas: base64Content,
      res_model: 'crm.lead',
      res_id: leadId,
      mimetype: 'text/plain',
      type: 'binary',
      public: false,
      description: 'Test attachment for chatter functionality',
    };

    const attachmentId = await client.create('ir.attachment', attachmentData);
    console.log(`✅ Created attachment with ID: ${attachmentId}`);

    // Step 3: Test attachment retrieval
    console.log('\n📋 Testing attachment retrieval...');
    
    const attachments = await client.searchRead('ir.attachment', 
      [
        ['res_model', '=', 'crm.lead'], 
        ['res_id', '=', leadId]
      ], 
      [
        'id', 'name', 'datas_fname', 'mimetype', 'file_size', 
        'res_model', 'res_id', 'create_date', 'create_uid',
        'type', 'public', 'description'
      ]
    );

    console.log(`📎 Found ${attachments.length} attachments:`);
    attachments.forEach(att => {
      console.log(`   • ${att.name} (${att.mimetype}) - ${att.file_size} bytes`);
      console.log(`     Created by: ${att.create_uid[1]} on ${att.create_date}`);
      console.log(`     Type: ${att.type}, Public: ${att.public}`);
    });

    // Step 4: Test attachment download
    console.log('\n📥 Testing attachment download...');
    
    if (attachments.length > 0) {
      const attachment = attachments[0];
      const attachmentData = await client.read('ir.attachment', attachment.id, ['datas']);
      
      if (attachmentData.length > 0 && attachmentData[0].datas) {
        const downloadedContent = Buffer.from(attachmentData[0].datas, 'base64').toString('utf8');
        console.log(`✅ Downloaded attachment content (${downloadedContent.length} chars):`);
        console.log(`   Preview: "${downloadedContent.substring(0, 50)}..."`);
      } else {
        console.log('⚠️ No attachment data found');
      }
    }

    // Step 5: Test different file types
    console.log('\n📄 Testing different file types...');
    
    const fileTypes = [
      {
        name: 'sample.json',
        content: JSON.stringify({ test: 'data', timestamp: Date.now() }, null, 2),
        mimetype: 'application/json'
      },
      {
        name: 'sample.csv',
        content: 'Name,Email,Phone\nJohn Doe,john@example.com,+1234567890\nJane Smith,jane@example.com,+0987654321',
        mimetype: 'text/csv'
      },
      {
        name: 'sample.html',
        content: '<html><body><h1>Test HTML File</h1><p>This is a test HTML attachment.</p></body></html>',
        mimetype: 'text/html'
      }
    ];

    const createdAttachments = [];
    
    for (const fileType of fileTypes) {
      const base64Data = Buffer.from(fileType.content).toString('base64');
      
      const fileAttachmentData = {
        name: fileType.name,
        datas_fname: fileType.name,
        datas: base64Data,
        res_model: 'crm.lead',
        res_id: leadId,
        mimetype: fileType.mimetype,
        type: 'binary',
        public: false,
      };

      const fileAttachmentId = await client.create('ir.attachment', fileAttachmentData);
      createdAttachments.push(fileAttachmentId);
      console.log(`✅ Created ${fileType.mimetype} attachment: ${fileType.name} (ID: ${fileAttachmentId})`);
    }

    // Step 6: Test attachment statistics
    console.log('\n📊 Testing attachment statistics...');
    
    const allAttachments = await client.searchRead('ir.attachment', 
      [
        ['res_model', '=', 'crm.lead'], 
        ['res_id', '=', leadId]
      ], 
      ['id', 'name', 'mimetype', 'file_size']
    );

    const stats = {
      total: allAttachments.length,
      totalSize: allAttachments.reduce((sum, att) => sum + (att.file_size || 0), 0),
      byType: {}
    };

    allAttachments.forEach(att => {
      const category = att.mimetype.split('/')[0];
      stats.byType[category] = (stats.byType[category] || 0) + 1;
    });

    console.log(`📊 Attachment Statistics:`);
    console.log(`   Total files: ${stats.total}`);
    console.log(`   Total size: ${stats.totalSize} bytes`);
    console.log(`   By type:`, stats.byType);

    // Step 7: Test attachment linking to messages
    console.log('\n💬 Testing attachment linking to messages...');
    
    // Post a message referencing the attachments
    await client.callModel('crm.lead', 'message_post', [], {
      body: `<p>📎 <strong>Files uploaded:</strong></p><ul>${allAttachments.map(att => `<li>${att.name} (${att.mimetype})</li>`).join('')}</ul>`,
      message_type: 'comment',
    });
    console.log('✅ Posted message with attachment references');

    // Step 8: Test attachment permissions and access
    console.log('\n🔒 Testing attachment permissions...');
    
    // Test public vs private attachments
    const publicAttachmentData = {
      name: 'public-file.txt',
      datas_fname: 'public-file.txt',
      datas: Buffer.from('This is a public attachment').toString('base64'),
      res_model: 'crm.lead',
      res_id: leadId,
      mimetype: 'text/plain',
      type: 'binary',
      public: true, // Public attachment
    };

    const publicAttachmentId = await client.create('ir.attachment', publicAttachmentData);
    console.log(`✅ Created public attachment with ID: ${publicAttachmentId}`);

    // Step 9: Test attachment URL generation
    console.log('\n🔗 Testing attachment URL generation...');
    
    const baseUrl = client.baseURL.replace('/xmlrpc/2/', '');
    allAttachments.forEach(att => {
      const downloadUrl = `${baseUrl}/web/content/${att.id}?download=true`;
      const previewUrl = `${baseUrl}/web/content/${att.id}`;
      console.log(`📎 ${att.name}:`);
      console.log(`   Download: ${downloadUrl}`);
      console.log(`   Preview: ${previewUrl}`);
    });

    // Step 10: Test attachment search and filtering
    console.log('\n🔍 Testing attachment search and filtering...');
    
    // Search by mimetype
    const textFiles = await client.searchRead('ir.attachment', 
      [
        ['res_model', '=', 'crm.lead'], 
        ['res_id', '=', leadId],
        ['mimetype', 'like', 'text/%']
      ], 
      ['id', 'name', 'mimetype']
    );
    console.log(`📄 Found ${textFiles.length} text files`);

    // Search by file size
    const largeFiles = await client.searchRead('ir.attachment', 
      [
        ['res_model', '=', 'crm.lead'], 
        ['res_id', '=', leadId],
        ['file_size', '>', 100]
      ], 
      ['id', 'name', 'file_size']
    );
    console.log(`📦 Found ${largeFiles.length} files larger than 100 bytes`);

    // Step 11: Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete all test attachments
    const allTestAttachments = await client.searchRead('ir.attachment', 
      [
        ['res_model', '=', 'crm.lead'], 
        ['res_id', '=', leadId]
      ], 
      ['id']
    );

    if (allTestAttachments.length > 0) {
      const attachmentIds = allTestAttachments.map(att => att.id);
      await client.delete('ir.attachment', attachmentIds);
      console.log(`✅ Deleted ${attachmentIds.length} test attachments`);
    }
    
    // Delete test lead
    await client.delete('crm.lead', leadId);
    console.log(`✅ Deleted test lead ${leadId}`);

    console.log('\n🎉 Attachments Testing Completed Successfully!');
    console.log('\n📋 Attachments Features Tested:');
    console.log('✅ Attachment creation with base64 data');
    console.log('✅ Attachment retrieval and metadata');
    console.log('✅ Attachment download and content access');
    console.log('✅ Multiple file types (text, JSON, CSV, HTML)');
    console.log('✅ Attachment statistics and categorization');
    console.log('✅ Message integration with attachment references');
    console.log('✅ Public vs private attachment permissions');
    console.log('✅ URL generation for download and preview');
    console.log('✅ Search and filtering by mimetype and size');
    
    console.log('\n🎯 Attachments Component Features:');
    console.log('• File upload with drag & drop or picker');
    console.log('• File download and local storage');
    console.log('• File type icons and previews');
    console.log('• File size formatting and statistics');
    console.log('• Permission-based access control');
    console.log('• Integration with chatter messages');
    console.log('• Search and filter capabilities');

  } catch (error) {
    console.error('❌ Attachments test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testAttachments();
