import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'expiration',
  displayName: 'Expiration',
  jsonApiType: 'expirations',
  endpoint: 'expirations',
  operations: ['getAll', 'get'],
  fields: [],
};
