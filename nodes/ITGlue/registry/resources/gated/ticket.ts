// GATED: endpoint unverified against the live IT Glue API. Excluded from enabledResources until confirmed by scripts/verify-endpoints.ts (Task 19 Part B).

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'ticket',
  displayName: 'Ticket',
  jsonApiType: 'tickets',
  endpoint: 'tickets',
  operations: ['getAll', 'get', 'create', 'update', 'delete'],
  orgScoped: true,
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The ticket name/title',
    },
    {
      name: 'organizationId',
      attribute: 'organization-id',
      displayName: 'Organization',
      type: 'options',
      loadOptionsMethod: 'getOrganizations',
      onOperations: ['create', 'update'],
      description: 'The organization this ticket belongs to',
    },
    {
      name: 'status',
      attribute: 'status',
      displayName: 'Status',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The ticket status',
    },
    {
      name: 'priority',
      attribute: 'priority',
      displayName: 'Priority',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The ticket priority',
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
      name: 'status',
      attribute: 'status',
      displayName: 'Status',
      type: 'string',
      description: 'Filter by ticket status',
    },
  ],
  gated: true,
};
