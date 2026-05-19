// GATED: live probe (2026-05-19) returned HTTP 401 on GET /checklist_tasks — not a confirmed top-level collection (likely only valid nested under a checklist). Excluded from enabledResources pending nested-route support.

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'checklistTask',
  displayName: 'Checklist Task',
  jsonApiType: 'checklist_tasks',
  endpoint: 'checklist_tasks',
  operations: ['getAll', 'get', 'create', 'update', 'delete'],
  fields: [
    {
      name: 'checklistId',
      attribute: 'checklist-id',
      displayName: 'Checklist ID',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The parent checklist ID',
    },
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The checklist task name',
    },
    {
      name: 'completed',
      attribute: 'completed',
      displayName: 'Completed',
      type: 'boolean',
      onOperations: ['create', 'update'],
      description: 'Whether the task is completed',
    },
  ],
  filters: [
    {
      name: 'checklistId',
      attribute: 'checklist-id',
      displayName: 'Checklist ID',
      type: 'string',
      description: 'Filter by checklist ID',
    },
  ],
  gated: true,
};
