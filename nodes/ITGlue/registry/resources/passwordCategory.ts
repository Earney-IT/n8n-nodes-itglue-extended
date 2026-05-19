import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'passwordCategory',
  displayName: 'Password Category',
  jsonApiType: 'password_categories',
  endpoint: 'password_categories',
  operations: ['getAll', 'get', 'create', 'update'],
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The password category name',
    },
  ],
};
