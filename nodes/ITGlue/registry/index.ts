import { ResourceDescriptor } from './types';
import { descriptor as organization } from './resources/organization';
import { descriptor as organizationType } from './resources/organizationType';
import { descriptor as organizationStatus } from './resources/organizationStatus';
import { descriptor as configuration } from './resources/configuration';
import { descriptor as configurationInterface } from './resources/configurationInterface';
import { descriptor as configurationStatus } from './resources/configurationStatus';
import { descriptor as configurationType } from './resources/configurationType';
import { descriptor as contact } from './resources/contact';
import { descriptor as contactType } from './resources/contactType';
import { descriptor as country } from './resources/country';
import { descriptor as domain } from './resources/domain';
import { descriptor as expiration } from './resources/expiration';
import { descriptor as group } from './resources/group';
import { descriptor as location } from './resources/location';
import { descriptor as log } from './resources/log';
import { descriptor as manufacturer } from './resources/manufacturer';
import { descriptor as model } from './resources/model';
import { descriptor as operatingSystem } from './resources/operatingSystem';
import { descriptor as platform } from './resources/platform';
import { descriptor as region } from './resources/region';
import { descriptor as user } from './resources/user';
import { descriptor as userMetric } from './resources/userMetric';
import { descriptor as passwordCategory } from './resources/passwordCategory';
import { descriptor as flexibleAssetField } from './resources/flexibleAssetField';
import { descriptor as flexibleAssetType } from './resources/flexibleAssetType';
// Special resources
import { descriptor as password } from './resources/password';
import { descriptor as flexibleAsset } from './resources/flexibleAsset';
import { descriptor as attachment } from './resources/attachment';
import { descriptor as relatedItem } from './resources/relatedItem';
import { descriptor as exportResource } from './resources/export';
import { descriptor as document } from './resources/document';

export const registry: ResourceDescriptor[] = [
  // Generic resources
  organization,
  organizationType,
  organizationStatus,
  configuration,
  configurationInterface,
  configurationStatus,
  configurationType,
  contact,
  contactType,
  country,
  domain,
  expiration,
  group,
  location,
  log,
  manufacturer,
  model,
  operatingSystem,
  platform,
  region,
  user,
  userMetric,
  passwordCategory,
  flexibleAssetField,
  flexibleAssetType,
  // Special resources
  password,
  flexibleAsset,
  attachment,
  relatedItem,
  exportResource,
  document,
];

export const enabledResources: ResourceDescriptor[] = registry.filter(r => !r.gated);
