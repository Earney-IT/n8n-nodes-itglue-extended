import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'export',
  displayName: 'Export',
  jsonApiType: 'exports',
  endpoint: 'exports',
  special: 'exports',
  idParam: 'exportId',
  operations: ['getAll', 'get', 'create', 'delete', 'createAndWait'],
  fields: [
    {
      name: 'format',
      attribute: 'format',
      displayName: 'Format',
      type: 'options',
      options: [
        { name: 'CSV', value: 'CSV' },
        { name: 'PDF', value: 'PDF' },
      ],
      onOperations: ['create', 'createAndWait'],
      description: 'The export file format',
    },
    {
      name: 'resourceType',
      attribute: 'resource-type',
      displayName: 'Resource Type',
      type: 'string',
      onOperations: ['create', 'createAndWait'],
      description: 'The resource type to export (e.g. configurations, passwords)',
    },
    {
      name: 'resourceId',
      attribute: 'resource-id',
      displayName: 'Resource ID',
      type: 'string',
      onOperations: ['create', 'createAndWait'],
      description: 'The ID of the specific resource to export (optional)',
    },
    {
      name: 'includeRelated',
      attribute: 'include-related',
      displayName: 'Include Related',
      type: 'boolean',
      default: false,
      onOperations: ['create', 'createAndWait'],
      description: 'Whether to include related resources in the export',
    },
  ],
};
