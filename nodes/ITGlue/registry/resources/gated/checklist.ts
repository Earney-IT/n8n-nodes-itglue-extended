// Live-verified 2026-05-19: GET /checklists returned HTTP 200. Enabled.

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
    // organizationId is auto-emitted by the orgScoped block in buildResourceProperties; an explicit field here would collide with the reserved-name guard.
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
};
