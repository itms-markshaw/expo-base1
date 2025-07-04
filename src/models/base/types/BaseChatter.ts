/**
 * Base Chatter Types
 * Universal types for chatter/messaging functionality across all models
 */

export interface BaseMessage {
  id: number;
  body: string;
  author_id: [number, string];
  date: string;
  message_type: 'email' | 'comment' | 'notification';
  subtype_id?: [number, string];
  model: string;
  res_id: number;
  parent_id?: [number, string];
  attachment_ids?: number[];
  tracking_value_ids?: number[];
  is_internal?: boolean;
  email_from?: string;
  reply_to?: string;
  subject?: string;
}

export interface BaseActivity {
  id: number;
  activity_type_id: [number, string];
  summary: string;
  note?: string;
  date_deadline: string;
  user_id: [number, string];
  res_model: string;
  res_id: number;
  state: 'overdue' | 'today' | 'planned';
  create_date: string;
  create_uid: [number, string];
}

export interface BaseAttachment {
  id: number;
  name: string;
  datas_fname?: string;
  file_size: number;
  mimetype: string;
  res_model: string;
  res_id: number;
  create_date: string;
  create_uid: [number, string];
  url?: string;
  local_path?: string;
}

export interface BaseFollower {
  id: number;
  partner_id: [number, string];
  res_model: string;
  res_id: number;
  subtype_ids?: number[];
}

export interface ChatterConfig {
  modelName: string;
  recordId: number;
  readonly?: boolean;
  showFollowers?: boolean;
  showActivities?: boolean;
  showAttachments?: boolean;
  allowInternalNotes?: boolean;
  allowEmails?: boolean;
  compactMode?: boolean;
}

export interface MessageComposerConfig {
  modelName: string;
  recordId: number;
  messageType: 'comment' | 'email';
  isInternal?: boolean;
  subject?: string;
  recipients?: number[];
  attachments?: File[];
}

export interface ActivityConfig {
  modelName: string;
  recordId: number;
  activityTypeId?: number;
  summary?: string;
  note?: string;
  deadline?: string;
  userId?: number;
}

export interface ChatterState {
  messages: BaseMessage[];
  activities: BaseActivity[];
  attachments: BaseAttachment[];
  followers: BaseFollower[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  offset: number;
}

export interface ChatterActions {
  loadMessages: (offset?: number) => Promise<void>;
  loadActivities: () => Promise<void>;
  loadAttachments: () => Promise<void>;
  loadFollowers: () => Promise<void>;
  postMessage: (config: MessageComposerConfig) => Promise<void>;
  scheduleActivity: (config: ActivityConfig) => Promise<void>;
  markActivityDone: (activityId: number) => Promise<void>;
  addFollower: (partnerId: number) => Promise<void>;
  removeFollower: (followerId: number) => Promise<void>;
  uploadAttachment: (file: File) => Promise<void>;
  deleteAttachment: (attachmentId: number) => Promise<void>;
}
