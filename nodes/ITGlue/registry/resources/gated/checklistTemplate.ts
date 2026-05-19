// GATED: endpoint unverified against the live IT Glue API. Excluded from enabledResources until confirmed by scripts/verify-endpoints.ts (Task 19 Part B).

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'checklistTemplate',
  displayName: 'Checklist Template',
  jsonApiType: 'checklist_templates',
  endpoint: 'checklist_templates',
  operations: ['getAll', 'get', 'create', 'update', 'delete', 'bulkUpdate', 'bulkDelete'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The checklist template name',
    },
  ],
  includes: ['attachments'],
  gated: true,
};
