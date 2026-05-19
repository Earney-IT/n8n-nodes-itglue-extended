import { INodePropertyOptions } from 'n8n-workflow';

export type OperationName =
  | 'getAll' | 'get' | 'create' | 'update' | 'delete' | 'bulkUpdate' | 'bulkDelete'
  // Special-handler operations (used only when special is set)
  | 'archive' | 'restore' | 'getVersions' | 'getVersion'
  | 'createAndWait'
  | 'publish';

export interface FieldDescriptor {
  name: string;                 // n8n param (camelCase)
  attribute: string;            // JSON:API attribute (kebab-case)
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'dateTime' | 'options' | 'json';
  required?: boolean;
  default?: unknown;
  description?: string;
  loadOptionsMethod?: string;
  options?: INodePropertyOptions[];
  onOperations?: OperationName[]; // default ['create','update']
  secret?: boolean;
  password?: boolean;           // mask input in UI
}

export interface ResourceDescriptor {
  name: string;                 // resource value e.g. 'password'
  displayName: string;          // 'Password'
  jsonApiType: string;          // 'passwords'
  endpoint: string;             // 'passwords'
  idParam?: string;             // default `${name}Id`
  operations: OperationName[];
  orgScoped?: boolean;          // offer "Scope to Organization"
  fields: FieldDescriptor[];
  filters?: FieldDescriptor[];
  includes?: string[];
  special?: 'passwords' | 'flexibleAssets' | 'attachments' | 'relatedItems' | 'exports' | 'documents';
  gated?: boolean;              // excluded from resource list until live-verified
}
