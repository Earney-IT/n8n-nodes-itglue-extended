// Live-verified 2026-05-19: GET /ssl_certificates returned HTTP 200. Enabled.

import { ResourceDescriptor } from '../../types';

export const descriptor: ResourceDescriptor = {
  name: 'sslCertificate',
  displayName: 'SSL Certificate',
  jsonApiType: 'ssl_certificates',
  endpoint: 'ssl_certificates',
  operations: ['getAll', 'get', 'create', 'update', 'delete'],
  orgScoped: true,
  fields: [
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      required: true,
      onOperations: ['create', 'update'],
      description: 'The SSL certificate name',
    },
    // organizationId is auto-emitted by the orgScoped block in buildResourceProperties; an explicit field here would collide with the reserved-name guard.
    {
      name: 'commonName',
      attribute: 'common-name',
      displayName: 'Common Name',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The certificate common name (CN)',
    },
    {
      name: 'issuer',
      attribute: 'issuer',
      displayName: 'Issuer',
      type: 'string',
      onOperations: ['create', 'update'],
      description: 'The certificate issuer',
    },
    {
      name: 'expiresAt',
      attribute: 'expires-at',
      displayName: 'Expires At',
      type: 'dateTime',
      onOperations: ['create', 'update'],
      description: 'The certificate expiration date/time',
    },
  ],
  filters: [
    {
      name: 'organizationId',
      attribute: 'organization-id',
      displayName: 'Organization ID',
      type: 'string',
      description: 'Filter by organization ID',
    },
    {
      name: 'name',
      attribute: 'name',
      displayName: 'Name',
      type: 'string',
      description: 'Filter by certificate name',
    },
  ],
  includes: ['attachments', 'related_items'],
};
