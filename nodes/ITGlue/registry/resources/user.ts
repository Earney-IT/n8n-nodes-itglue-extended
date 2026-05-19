import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'user',
  displayName: 'User',
  jsonApiType: 'users',
  endpoint: 'users',
  operations: ['getAll', 'get', 'update'],
  fields: [
    {
      name: 'firstName',
      attribute: 'first-name',
      displayName: 'First Name',
      type: 'string',
      onOperations: ['update'],
      description: 'The user first name',
    },
    {
      name: 'lastName',
      attribute: 'last-name',
      displayName: 'Last Name',
      type: 'string',
      onOperations: ['update'],
      description: 'The user last name',
    },
    {
      name: 'email',
      attribute: 'email',
      displayName: 'Email',
      type: 'string',
      onOperations: ['update'],
      description: 'The user email address',
    },
    {
      name: 'roleName',
      attribute: 'role-name',
      displayName: 'Role Name',
      type: 'string',
      onOperations: ['update'],
      description: 'The user role name',
    },
  ],
};
