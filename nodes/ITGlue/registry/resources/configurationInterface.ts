import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'configurationInterface',
  displayName: 'Configuration Interface',
  jsonApiType: 'configuration_interfaces',
  endpoint: 'configuration_interfaces',
  operations: ['getAll', 'get', 'create', 'update', 'delete'],
  fields: [
    {
      name: 'configurationId',
      attribute: 'configuration-id',
      displayName: 'Configuration ID',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The ID of the parent configuration',
    },
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The interface name',
    },
    {
      name: 'ipAddress',
      attribute: 'ip-address',
      displayName: 'IP Address',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The IP address of the interface',
    },
    {
      name: 'primary',
      attribute: 'primary',
      displayName: 'Primary',
      type: 'boolean',
      default: false,
      onOperations: ['create', 'update'],
      description: 'Whether this is the primary interface',
    },
    {
      name: 'notes',
      attribute: 'notes',
      displayName: 'Notes',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'Notes about the interface',
    },
  ],
};
