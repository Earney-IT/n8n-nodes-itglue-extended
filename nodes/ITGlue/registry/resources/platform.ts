import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'platform',
  displayName: 'Platform',
  jsonApiType: 'platforms',
  endpoint: 'platforms',
  operations: ['getAll', 'get'],
  fields: [],
};
