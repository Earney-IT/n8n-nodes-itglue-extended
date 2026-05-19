import { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { itGlueApiRequestAllItems } from '../transport/request';

function makeLoader(endpoint: string) {
	return async function (this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const items = await itGlueApiRequestAllItems.call(this, 'GET', endpoint, {}, { sort: 'name' });
		const opts = items
			.filter((it) => it && (it as IDataObject).id !== undefined)
			.map((it) => {
				const a = ((it as IDataObject).attributes ?? {}) as IDataObject;
				const name = (a.name ?? a.title ?? (it as IDataObject).id) as string;
				return { name: String(name), value: String((it as IDataObject).id) };
			});
		opts.sort((x, y) => x.name.localeCompare(y.name));
		return opts;
	};
}

export const getOrganizations = makeLoader('organizations');
export const getOrganizationTypes = makeLoader('organization_types');
export const getOrganizationStatuses = makeLoader('organization_statuses');
export const getConfigurationTypes = makeLoader('configuration_types');
export const getConfigurationStatuses = makeLoader('configuration_statuses');
export const getContactTypes = makeLoader('contact_types');
export const getPasswordCategories = makeLoader('password_categories');
export const getFlexibleAssetTypes = makeLoader('flexible_asset_types');
export const getLocations = makeLoader('locations');
export const getManufacturers = makeLoader('manufacturers');
export const getModels = makeLoader('models');
export const getOperatingSystems = makeLoader('operating_systems');

export async function getFlexibleAssetTypeFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const typeId = this.getCurrentNodeParameter('flexibleAssetTypeId') as string;
	if (!typeId) return [];
	const items = await itGlueApiRequestAllItems.call(
		this,
		'GET',
		`flexible_asset_types/${typeId}/relationships/flexible_asset_fields`,
		{},
		{ sort: 'order' },
	);
	return items
		.filter((it) => it && (it as IDataObject).id !== undefined)
		.map((it) => {
			const a = ((it as IDataObject).attributes ?? {}) as IDataObject;
			const label = (a.name ?? (it as IDataObject).id) as string;
			// value = the trait key IT Glue expects; prefer attributes 'name-key' if present else slug of name
			const valueKey = (
				a['name-key'] ??
				a.nameKey ??
				String(label)
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-+|-+$/g, '')
			) as string;
			return { name: String(label), value: String(valueKey) };
		});
}
