import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'log',
  displayName: 'Log',
  jsonApiType: 'logs',
  endpoint: 'logs',
  operations: ['getAll'],
  fields: [],
};
