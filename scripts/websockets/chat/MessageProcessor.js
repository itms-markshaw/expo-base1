/**
 * Message Processor - Handles message formatting, validation, and transformation
 * Provides utilities for message content processing and validation
 */
class MessageProcessor {
  constructor() {
    // Message validation rules
    this.maxMessageLength = 4000; // Characters
    this.maxAttachments = 10;
    this.allowedMessageTypes = ['text', 'image', 'video', 'audio', 'file', 'voice'];
    
    // Content processing patterns
    this.urlPattern = /(https?:\/\/[^\s]+)/g;
    this.mentionPattern = /@(\w+)/g;
    this.hashtagPattern = /#(\w+)/g;
    this.emojiPattern = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
  }

  /**
   * Validate message content and structure
   */
  validateMessage(message) {
    const errors = [];

    // Check required fields
    if (!message.content && !message.attachment_ids) {
      errors.push('Message must have content or attachments');
    }

    // Validate content length
    if (message.content && message.content.length > this.maxMessageLength) {
      errors.push(`Message too long (max ${this.maxMessageLength} characters)`);
    }

    // Validate message type
    if (message.message_type && !this.allowedMessageTypes.includes(message.message_type)) {
      errors.push(`Invalid message type: ${message.message_type}`);
    }

    // Validate attachments
    if (message.attachment_ids && Array.isArray(message.attachment_ids)) {
      if (message.attachment_ids.length > this.maxAttachments) {
        errors.push(`Too many attachments (max ${this.maxAttachments})`);
      }
    }

    // Validate channel ID
    if (!message.channel_id || typeof message.channel_id !== 'number') {
      errors.push('Valid channel_id is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process message content for display
   */
  processMessageContent(content) {
    if (!content || typeof content !== 'string') {
      return {
        text: '',
        urls: [],
        mentions: [],
        hashtags: [],
        hasEmojis: false
      };
    }

    // Extract URLs
    const urls = [];
    const urlMatches = content.match(this.urlPattern);
    if (urlMatches) {
      urls.push(...urlMatches);
    }

    // Extract mentions
    const mentions = [];
    const mentionMatches = content.match(this.mentionPattern);
    if (mentionMatches) {
      mentions.push(...mentionMatches.map(m => m.substring(1))); // Remove @
    }

    // Extract hashtags
    const hashtags = [];
    const hashtagMatches = content.match(this.hashtagPattern);
    if (hashtagMatches) {
      hashtags.push(...hashtagMatches.map(h => h.substring(1))); // Remove #
    }

    // Check for emojis
    const hasEmojis = this.emojiPattern.test(content);

    return {
      text: content,
      urls,
      mentions,
      hashtags,
      hasEmojis
    };
  }

  /**
   * Format message content with rich text elements
   */
  formatMessageContent(content) {
    if (!content) return '';

    let formattedContent = content;

    // Make URLs clickable (for web/HTML display)
    formattedContent = formattedContent.replace(
      this.urlPattern,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Highlight mentions
    formattedContent = formattedContent.replace(
      this.mentionPattern,
      '<span class="mention">@$1</span>'
    );

    // Highlight hashtags
    formattedContent = formattedContent.replace(
      this.hashtagPattern,
      '<span class="hashtag">#$1</span>'
    );

    return formattedContent;
  }

  /**
   * Enhanced sanitize message content for security
   */
  sanitizeContent(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    let sanitized = content;

    // Enhanced XSS protection
    sanitized = sanitized
      // Remove dangerous scripts
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove dangerous event handlers (comprehensive list)
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s*on\w+\s*=\s*[^"'\s>]+/gi, '')
      // Remove javascript: protocols
      .replace(/javascript\s*:/gi, '')
      // Remove vbscript: protocols
      .replace(/vbscript\s*:/gi, '')
      // Remove data: URLs (can contain scripts) - except images
      .replace(/data\s*:(?!image\/)/gi, '')
      // Remove dangerous CSS expressions
      .replace(/expression\s*\(/gi, '')
      // Remove dangerous style attributes
      .replace(/style\s*=\s*["'][^"']*expression[^"']*["']/gi, '')
      // Limit consecutive newlines
      .replace(/\n{4,}/g, '\n\n\n')
      // Remove excessive whitespace
      .replace(/[ \t]{4,}/g, '   ')
      // Remove null bytes and other control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();

    // Additional dangerous patterns
    const dangerousPatterns = [
      /document\.cookie/gi,
      /document\.write/gi,
      /window\.location/gi,
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<form/gi
    ];

    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Validate content length after sanitization
    if (sanitized.length > this.maxMessageLength) {
      sanitized = sanitized.substring(0, this.maxMessageLength - 3) + '...';
    }

    // Final validation - ensure no remaining dangerous content
    if (this.containsDangerousContent(sanitized)) {
      console.warn('⚠️ Potentially dangerous content detected and removed');
      sanitized = this.stripAllHtml(sanitized);
    }

    return sanitized;
  }

  /**
   * Check for remaining dangerous content
   */
  containsDangerousContent(content) {
    const dangerousIndicators = [
      /<[^>]*>/,  // Any HTML tags
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /on\w+\s*=/i
    ];

    return dangerousIndicators.some(pattern => pattern.test(content));
  }

  /**
   * Strip all HTML tags as fallback
   */
  stripAllHtml(content) {
    return content.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Generate message preview for notifications
   */
  generatePreview(message, maxLength = 100) {
    if (!message.content) {
      // Handle non-text messages
      switch (message.message_type) {
        case 'image':
          return '📷 Image';
        case 'video':
          return '🎥 Video';
        case 'audio':
          return '🎵 Audio';
        case 'voice':
          return '🎤 Voice message';
        case 'file':
          return '📎 File';
        default:
          return 'Message';
      }
    }

    // Truncate text content
    let preview = message.content;
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength - 3) + '...';
    }

    return preview;
  }

  /**
   * Extract search keywords from message
   */
  extractSearchKeywords(message) {
    const keywords = new Set();

    if (message.content) {
      // Split content into words
      const words = message.content
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2); // Only words longer than 2 chars

      words.forEach(word => keywords.add(word));

      // Add mentions and hashtags
      const processed = this.processMessageContent(message.content);
      processed.mentions.forEach(mention => keywords.add(mention.toLowerCase()));
      processed.hashtags.forEach(hashtag => keywords.add(hashtag.toLowerCase()));
    }

    // Add author name
    if (message.author_name) {
      keywords.add(message.author_name.toLowerCase());
    }

    return Array.from(keywords);
  }

  /**
   * Check if message contains specific content
   */
  containsContent(message, searchTerm) {
    if (!searchTerm || !message.content) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    const content = message.content.toLowerCase();

    // Direct content match
    if (content.includes(term)) {
      return true;
    }

    // Check processed content
    const processed = this.processMessageContent(message.content);
    
    // Check mentions
    if (processed.mentions.some(mention => mention.toLowerCase().includes(term))) {
      return true;
    }

    // Check hashtags
    if (processed.hashtags.some(hashtag => hashtag.toLowerCase().includes(term))) {
      return true;
    }

    // Check author name
    if (message.author_name && message.author_name.toLowerCase().includes(term)) {
      return true;
    }

    return false;
  }

  /**
   * Transform message for different display contexts
   */
  transformForContext(message, context = 'chat') {
    const baseMessage = {
      id: message.id,
      content: message.content,
      author_id: message.author_id,
      author_name: message.author_name,
      created_at: message.created_at,
      message_type: message.message_type || 'text'
    };

    switch (context) {
      case 'notification':
        return {
          ...baseMessage,
          preview: this.generatePreview(message, 50),
          processed: this.processMessageContent(message.content)
        };

      case 'search':
        return {
          ...baseMessage,
          keywords: this.extractSearchKeywords(message),
          preview: this.generatePreview(message, 200)
        };

      case 'export':
        return {
          ...baseMessage,
          content_sanitized: this.sanitizeContent(message.content),
          content_formatted: this.formatMessageContent(message.content)
        };

      case 'chat':
      default:
        return {
          ...baseMessage,
          processed: this.processMessageContent(message.content),
          is_optimistic: message.is_optimistic || false,
          sync_status: message.sync_status || 'synced'
        };
    }
  }

  /**
   * Validate and process message for sending
   */
  prepareMessageForSending(content, options = {}) {
    const {
      messageType = 'text',
      channelId,
      replyToId = null,
      attachments = null
    } = options;

    // Create message object
    const message = {
      content: this.sanitizeContent(content),
      message_type: messageType,
      channel_id: channelId,
      reply_to_id: replyToId,
      attachment_ids: attachments
    };

    // Validate message
    const validation = this.validateMessage(message);
    if (!validation.isValid) {
      throw new Error(`Message validation failed: ${validation.errors.join(', ')}`);
    }

    return message;
  }

  /**
   * Check if message is a system message
   */
  isSystemMessage(message) {
    return message.message_type === 'notification' || 
           message.author_id === null ||
           message.author_id === 0;
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message, currentUserId) {
    return message.author_id === currentUserId;
  }

  /**
   * Get message age in human readable format
   */
  getMessageAge(message) {
    if (!message.created_at) return 'Unknown';

    const messageTime = new Date(message.created_at);
    const now = new Date();
    const diffMs = now - messageTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return messageTime.toLocaleDateString();
  }
}

// Create singleton instance
const messageProcessor = new MessageProcessor();

export default messageProcessor;
