// Live-verified 2026-05-19: GET /checklist_templates returned HTTP 200. Enabled.

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
};
