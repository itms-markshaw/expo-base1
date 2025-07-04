/**
 * Base Model Types
 * Universal interfaces and types for all Odoo models
 */

export interface BaseModel {
  id: number;
  create_date?: string;
  write_date?: string;
  create_uid?: [number, string];
  write_uid?: [number, string];
  display_name?: string;
  __last_update?: string;
}

export interface BaseChatterModel extends BaseModel {
  message_ids?: number[];
  message_follower_ids?: number[];
  activity_ids?: number[];
  message_attachment_count?: number;
}

export interface BaseListViewProps<T extends BaseModel> {
  data: T[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onItemPress?: (item: T) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export interface BaseFormViewProps<T extends BaseModel> {
  record?: T;
  mode: 'view' | 'edit' | 'create';
  onSave?: (data: Partial<T>) => void;
  onCancel?: () => void;
  loading?: boolean;
  readonly?: boolean;
}

export interface BaseBottomSheetProps<T extends BaseModel> {
  record: T;
  visible: boolean;
  onClose: () => void;
  actions?: BottomSheetAction<T>[];
}

export interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
}

export interface BottomSheetAction<T extends BaseModel> {
  id: string;
  label: string;
  icon: string;
  color?: string;
  onPress: (record: T) => void;
  disabled?: boolean;
}

export interface BaseScreenConfig {
  modelName: string;
  displayName: string;
  screenNumber: number;
  category: 'list' | 'detail' | 'edit' | 'create' | 'bottomsheet' | 'chatter' | 'attachments' | 'activities' | 'custom';
}

export interface ModelFieldConfig {
  name: string;
  type: 'char' | 'text' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'selection' | 'many2one' | 'one2many' | 'many2many';
  label: string;
  required?: boolean;
  readonly?: boolean;
  help?: string;
  selection?: [string, string][];
  relation?: string;
}

export interface ModelConfig {
  name: string;
  displayName: string;
  description?: string;
  fields: ModelFieldConfig[];
  defaultOrder?: string;
  searchFields?: string[];
  listFields?: string[];
  formFields?: string[];
}
