// Live-verified 2026-05-19: GET /tickets returned HTTP 200. Enabled.

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
    // organizationId is auto-emitted by the orgScoped block in buildResourceProperties; an explicit field here would collide with the reserved-name guard.
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
};
