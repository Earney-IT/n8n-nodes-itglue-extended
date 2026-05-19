// GATED: endpoint unverified against the live IT Glue API. Excluded from enabledResources until confirmed by scripts/verify-endpoints.ts (Task 19 Part B).

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'checklist',
  displayName: 'Checklist',
  jsonApiType: 'checklists',
  endpoint: 'checklists',
  operations: ['getAll', 'get', 'create', 'update', 'delete', 'bulkUpdate', 'bulkDelete'],
  orgScoped: true,
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The checklist name',
    },
    {
      name: 'organizationId',
      attribute: 'organization-id',
      displayName: 'Organization',
      type: 'options',
      loadOptionsMethod: 'getOrganizations',
      onOperations: ['create', 'update'],
      description: 'The organization this checklist belongs to',
    },
  ],
  filters: [
    {
      name: 'organizationId',
      attribute: 'organization-id',
      displayName: 'Organization ID',
      type: 'string',
      description: 'Filter by organization ID',
    },
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      description: 'Filter by checklist name',
    },
  ],
  includes: ['attachments', 'checklist_tasks', 'related_items', 'recent_versions'],
  gated: true,
};
