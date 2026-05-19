// GATED: endpoint unverified against the live IT Glue API. Excluded from enabledResources until confirmed by scripts/verify-endpoints.ts (Task 19 Part B).

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'passwordFolder',
  displayName: 'Password Folder',
  jsonApiType: 'password_folders',
  endpoint: 'password_folders',
  operations: ['getAll', 'get', 'create', 'update', 'delete', 'bulkDelete'],
  orgScoped: true,
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The password folder name',
    },
    {
      name: 'parentId',
      attribute: 'parent-id',
      displayName: 'Parent Folder ID',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The parent folder ID (for nested folders)',
    },
  ],
  filters: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      description: 'Filter by folder name',
    },
    {
      name: 'organizationId',
      attribute: 'organization-id',
      displayName: 'Organization ID',
      type: 'string',
      description: 'Filter by organization ID',
    },
  ],
  gated: true,
};
