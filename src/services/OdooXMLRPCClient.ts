/**
 * Clean Odoo XML-RPC Client - PRODUCTION READY
 * Fixed all parsing issues and authentication flow
 */

import { AuthResult, User } from '../types';

export class OdooXMLRPCClient {
  private baseURL: string;
  private database: string;
  private username: string;
  private password?: string;
  private apiKey?: string;
  private uid: number | null = null;
  private sessionInfo: any = null;

  constructor(config: { baseURL: string; database: string; username: string; apiKey?: string; password?: string }) {
    console.log('🔧 OdooXMLRPCClient constructor called with config:', {
      configType: typeof config,
      configIsNull: config === null,
      configIsUndefined: config === undefined,
      configKeys: config ? Object.keys(config) : 'NO_CONFIG',
      baseURL: config?.baseURL,
      database: config?.database,
      username: config?.username,
      hasPassword: !!config?.password,
      hasApiKey: !!config?.apiKey,
      apiKeyLength: config?.apiKey?.length,
      rawConfig: config
    });
    
    this.baseURL = config.baseURL?.replace(/\/$/, ''); // Remove trailing slash
    this.database = config.database;
    this.username = config.username;
    this.password = config.password;
    this.apiKey = config.apiKey;
    
    console.log('🔧 XML-RPC Client properties after assignment:', {
      baseURL: this.baseURL,
      database: this.database || 'auto-detect',
      username: this.username,
      hasPassword: !!this.password,
      hasApiKey: !!this.apiKey
    });
  }

  /**
   * Authenticate with Odoo server
   */
  async authenticate(): Promise<{ uid: number; session: any; database: string }> {
    if (this.uid && this.sessionInfo) {
      // Reduced logging
      // console.log('✅ Using cached authentication');
      return { uid: this.uid, session: this.sessionInfo, database: this.database };
    }

    try {
      console.log('🔐 Starting XML-RPC authentication...');

      // Step 1: Test server connectivity and get version
      console.log('📡 Testing server connectivity...');
      this.sessionInfo = await this.callService('common', 'version', []);
      console.log('✅ Server reachable. Version:', this.sessionInfo);

      // Step 2: Get available databases
      let targetDatabase = this.database;
      try {
        console.log('🔍 Fetching available databases...');
        const databases = await this.listDatabases();
        console.log('📋 Available databases:', databases);

        if (!targetDatabase && databases.length > 0) {
          // Auto-select first database
          targetDatabase = databases[0];
          console.log(`🎯 Auto-selected database: ${targetDatabase}`);
        } else if (targetDatabase && !databases.includes(targetDatabase)) {
          console.warn(`⚠️ Database "${targetDatabase}" not found. Available: ${databases.join(', ')}`);
          if (databases.length > 0) {
            targetDatabase = databases[0];
            console.log(`🔄 Falling back to: ${targetDatabase}`);
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Could not fetch databases, using provided name:', dbError.message);
        targetDatabase = this.database || 'odoo';
      }

      // Step 3: Authenticate
      const credential = this.apiKey || this.password;
      if (!credential) {
        throw new Error('No password or API key provided');
      }

      console.log(`🔐 Authenticating: ${this.username} @ ${targetDatabase}`);
      console.log(`🔐 Using: ${this.apiKey ? 'API Key' : 'Password'} (length: ${credential.length})`);

      this.uid = await this.callService('common', 'authenticate', [
        targetDatabase,
        this.username,
        credential,
        {}
      ]);

      console.log('🔐 Authentication response:', this.uid);

      if (!this.uid || this.uid === false) {
        const errorMsg = `
❌ Authentication failed for ${this.username}@${targetDatabase}

🔍 TROUBLESHOOTING:
1. **Most likely cause: 2FA (Two-Factor Authentication)**
   - Your Odoo instance requires API keys for XML-RPC
   - Go to: Settings → My Profile → Account Security → New API Key
   - Replace your password with the generated API key

2. **Check credentials:**
   - Username: ${this.username}
   - Database: ${targetDatabase}
   - Credential length: ${credential.length} chars

3. **Verify server settings:**
   - URL: ${this.baseURL}
   - XML-RPC enabled: Check Odoo settings

4. **Test manual login:**
   - Try logging into ${this.baseURL} with these credentials
   - If manual login works but API fails = 2FA issue
        `;
        throw new Error(errorMsg);
      }

      this.database = targetDatabase; // Save working database
      console.log(`✅ XML-RPC authenticated! UID: ${this.uid}, Database: ${targetDatabase}`);
      
      return { 
        uid: this.uid, 
        session: this.sessionInfo, 
        database: targetDatabase 
      };

    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      this.uid = null;
      this.sessionInfo = null;
      throw error;
    }
  }

  /**
   * Call Odoo service (common, object, db)
   */
  async callService(service: string, method: string, params: any[] = []): Promise<any> {
    const url = `${this.baseURL}/xmlrpc/2/${service}`;
    const xmlPayload = this.buildXMLRPCCall(method, params);

    // Reduced logging - only log errors
    // console.log(`📡 XML-RPC: ${service}.${method}(${params.length} params)`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'Accept': 'text/xml',
          'User-Agent': 'OdooSyncApp-XMLRPC/1.0'
        },
        body: xmlPayload
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      // Reduced logging - only log errors
      // console.log(`📨 Response preview: ${xmlText.substring(0, 200)}...`);

      return this.parseXMLRPCResponse(xmlText);
    } catch (error) {
      console.error(`❌ XML-RPC call failed: ${service}.${method}`, error);
      throw error;
    }
  }

  /**
   * Call model methods (main API)
   */
  async callModel(model: string, method: string, args: any[] = [], kwargs: any = {}): Promise<any> {
    await this.authenticate();

    return await this.callService('object', 'execute_kw', [
      this.database,
      this.uid,
      this.apiKey || this.password,
      model,
      method,
      args,
      kwargs
    ]);
  }

  // Additional helper methods for common operations
  async searchRead(model: string, domain: any[] = [], fields: string[] = [], options: any = {}): Promise<any[]> {
    const { limit = 100, offset = 0, order = 'id desc' } = options;
    
    return await this.callModel(model, 'search_read', [domain], {
      fields,
      limit,
      offset,
      order
    });
  }

  async getFields(model: string): Promise<any> {
    return await this.callModel(model, 'fields_get', [], {
      attributes: ['string', 'type', 'help', 'required']
    });
  }

  async searchCount(model: string, domain: any[] = []): Promise<number> {
    return await this.callModel(model, 'search_count', [domain]);
  }

  /**
   * Test connection to server
   */
  async testConnection(): Promise<{ success: boolean; message?: string; error?: string; version?: any; uid?: number; database?: string }> {
    try {
      console.log('🧪 Testing XML-RPC connection...');
      
      // Test server accessibility
      const version = await this.callService('common', 'version', []);
      console.log('✅ Server reachable, version:', version);
      
      // Test authentication if not already done
      if (!this.uid) {
        await this.authenticate();
      }
      
      return {
        success: true,
        message: 'Connection successful',
        version,
        uid: this.uid,
        database: this.database
      };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List databases (helper method)
   */
  async listDatabases(): Promise<string[]> {
    try {
      const databases = await this.callService('db', 'list', []);
      return Array.isArray(databases) ? databases : [];
    } catch (error) {
      console.warn('⚠️ Could not list databases:', error.message);
      return [];
    }
  }

  // Private XML-RPC implementation methods
  private buildXMLRPCCall(methodName: string, params: any[]): string {
    const paramXML = params.map(param => this.valueToXML(param)).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>${methodName}</methodName>
  <params>
    ${paramXML}
  </params>
</methodCall>`;
  }

  private valueToXML(value: any): string {
    if (value === null || value === undefined) {
      return '<param><value><nil/></value></param>';
    }
    
    if (typeof value === 'string') {
      return `<param><value><string>${this.escapeXML(value)}</string></value></param>`;
    }
    
    if (typeof value === 'number') {
      return Number.isInteger(value) 
        ? `<param><value><int>${value}</int></value></param>`
        : `<param><value><double>${value}</double></value></param>`;
    }
    
    if (typeof value === 'boolean') {
      return `<param><value><boolean>${value ? '1' : '0'}</boolean></value></param>`;
    }
    
    if (Array.isArray(value)) {
      const arrayData = value.map(item => this.valueToXML(item).replace(/<\/?param>/g, '')).join('');
      return `<param><value><array><data>${arrayData}</data></array></value></param>`;
    }
    
    if (typeof value === 'object') {
      const structMembers = Object.entries(value).map(([key, val]) =>
        `<member><name>${this.escapeXML(key)}</name>${this.valueToXML(val).replace(/<\/?param>/g, '')}</member>`
      ).join('');
      return `<param><value><struct>${structMembers}</struct></value></param>`;
    }
    
    return `<param><value><string>${this.escapeXML(String(value))}</string></value></param>`;
  }

  private escapeXML(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private parseXMLRPCResponse(xmlText: string): any {
    try {
      // Check for fault
      const faultMatch = xmlText.match(/<fault>\s*<value>\s*<struct>(.*?)<\/struct>\s*<\/value>\s*<\/fault>/s);
      if (faultMatch) {
        const faultCode = xmlText.match(/<name>faultCode<\/name>\s*<value><int>(\d+)<\/int><\/value>/);
        const faultString = xmlText.match(/<name>faultString<\/name>\s*<value><string>(.*?)<\/string><\/value>/s);
        
        const errorMsg = faultString ? faultString[1] : 'Unknown XML-RPC fault';
        console.error('❌ XML-RPC Fault:', errorMsg);
        throw new Error(`XML-RPC Fault: ${errorMsg}`);
      }

      // Extract response value
      const valueMatch = xmlText.match(/<methodResponse>\s*<params>\s*<param>\s*<value>(.*?)<\/value>\s*<\/param>\s*<\/params>\s*<\/methodResponse>/s);
      if (!valueMatch) {
        throw new Error('Invalid XML-RPC response format');
      }

      const result = this.parseValue(valueMatch[1]);
      // Reduced logging - only log errors
      // console.log('✅ Parsed result type:', typeof result, Array.isArray(result) ? `(array[${result.length}])` : '');
      return result;
    } catch (error) {
      console.error('❌ XML-RPC parse error:', error.message);
      console.error('❌ Raw XML (first 500 chars):', xmlText.substring(0, 500));
      throw new Error(`Failed to parse XML-RPC response: ${error.message}`);
    }
  }

  private parseValue(valueXML: string): any {
    const trimmed = valueXML.trim();

    // String
    const stringMatch = trimmed.match(/^<string>(.*?)<\/string>$/s);
    if (stringMatch) return stringMatch[1];

    // Integer
    const intMatch = trimmed.match(/^<(?:int|i4)>(.*?)<\/(?:int|i4)>$/);
    if (intMatch) return parseInt(intMatch[1], 10);

    // Double
    const doubleMatch = trimmed.match(/^<double>(.*?)<\/double>$/);
    if (doubleMatch) return parseFloat(doubleMatch[1]);

    // Boolean
    const boolMatch = trimmed.match(/^<boolean>(.*?)<\/boolean>$/);
    if (boolMatch) return boolMatch[1] === '1' || boolMatch[1] === 'true';

    // Nil/Null
    if (trimmed.includes('<nil') || trimmed === '') return null;

    // Array
    const arrayMatch = trimmed.match(/^<array>\s*<data>(.*?)<\/data>\s*<\/array>$/s);
    if (arrayMatch) {
      const dataContent = arrayMatch[1];
      const values = [];

      let currentPos = 0;
      let depth = 0;
      let valueStart = -1;

      for (let i = 0; i < dataContent.length; i++) {
        if (dataContent.substring(i, i + 7) === '<value>') {
          if (depth === 0) {
            valueStart = i + 7;
          }
          depth++;
        } else if (dataContent.substring(i, i + 8) === '</value>') {
          depth--;
          if (depth === 0 && valueStart !== -1) {
            const valueContent = dataContent.substring(valueStart, i);
            values.push(this.parseValue(valueContent));
            valueStart = -1;
          }
        }
      }

      return values;
    }

    // Struct/Object
    const structMatch = trimmed.match(/^<struct>(.*?)<\/struct>$/s);
    if (structMatch) {
      const members = structMatch[1].match(/<member>.*?<\/member>/gs) || [];
      const result: any = {};
      
      members.forEach(member => {
        const nameMatch = member.match(/<name>(.*?)<\/name>/);
        const valueMatch = member.match(/<value>(.*?)<\/value>/s);
        if (nameMatch && valueMatch) {
          result[nameMatch[1]] = this.parseValue(valueMatch[1]);
        }
      });
      return result;
    }

    // Default to string if no type specified
    return trimmed;
  }

  // ==================== CONVENIENCE METHODS ====================

  async searchRead(model, domain = [], fields = [], options = {}) {
    const { limit = 100, offset = 0, order = 'id desc' } = options;

    return await this.callModel(model, 'search_read', [domain], {
      fields,
      limit,
      offset,
      order
    });
  }

  async create(model, values) {
    return await this.callModel(model, 'create', [values]);
  }

  async update(model, ids, values) {
    return await this.callModel(model, 'write', [
      Array.isArray(ids) ? ids : [ids],
      values
    ]);
  }

  async delete(model, ids) {
    return await this.callModel(model, 'unlink', [
      Array.isArray(ids) ? ids : [ids]
    ]);
  }

  async search(model, domain = [], options = {}) {
    const { limit = 100, offset = 0, order = 'id desc' } = options;

    return await this.callModel(model, 'search', [domain], {
      limit,
      offset,
      order
    });
  }

  async read(model, ids, fields = []) {
    return await this.callModel(model, 'read', [
      Array.isArray(ids) ? ids : [ids]
    ], { fields });
  }

  async searchCount(model, domain = []) {
    return await this.callModel(model, 'search_count', [domain]);
  }

  async getFields(model) {
    return await this.callModel(model, 'fields_get', [], {
      attributes: ['string', 'type', 'help', 'required']
    });
  }

  /**
   * Test connection to server
   */
  async testConnection() {
    try {
      console.log('🧪 Testing XML-RPC connection...');

      // Test server accessibility
      const version = await this.callService('common', 'version', []);
      console.log('✅ Server reachable, version:', version);

      // Test authentication if not already done
      if (!this.uid) {
        await this.authenticate();
      }

      return {
        success: true,
        message: 'Connection successful',
        version,
        uid: this.uid,
        database: this.database
      };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}