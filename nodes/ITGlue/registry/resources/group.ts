import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'group',
  displayName: 'Group',
  jsonApiType: 'groups',
  endpoint: 'groups',
  operations: ['getAll', 'get', 'create', 'update', 'delete'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The group name',
    },
  ],
};
