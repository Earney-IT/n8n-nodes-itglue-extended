import { ResourceDescriptor } from '../types';

export const descriptor: ResourceDescriptor = {
  name: 'userMetric',
  displayName: 'User Metric',
  jsonApiType: 'user_metrics',
  endpoint: 'user_metrics',
  operations: ['getAll'],
  fields: [],
};
