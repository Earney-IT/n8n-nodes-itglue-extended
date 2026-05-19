import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'contactType',
  displayName: 'Contact Type',
  jsonApiType: 'contact_types',
  endpoint: 'contact_types',
  operations: ['getAll', 'get', 'create', 'update'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The contact type name',
    },
  ],
};
