import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { itGlueApiRequest, itGlueApiRequestAllItems } from '../../transport/request';
import { buildJsonApiBody, flattenResource } from '../../engine/jsonapi';

type FlexibleAssetOperation = 'getAll' | 'get' | 'create' | 'update' | 'delete' | 'bulkDelete';

export async function executeFlexibleAsset(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as FlexibleAssetOperation;
	const self = this;

	function req(name: string): string {
		const val = self.getNodeParameter(name, index, '') as unknown;
		if (!val && val !== 0 && val !== '0') {
			throw new NodeOperationError(
				self.getNode(),
				`"${name}" is required for "${operation}" on Flexible Asset.`,
				{ itemIndex: index },
			);
		}
		return String(val);
	}

	function collectTraits(): IDataObject {
		const tCol = self.getNodeParameter('traits', index, {}) as IDataObject;
		const list = (tCol.trait as Array<{ name: string; value: unknown }>) ?? [];
		const traits: IDataObject = {};
		for (const t of list) {
			if (t && t.name) traits[String(t.name)] = t.value as IDataObject[string];
		}
		return traits;
	}

	switch (operation) {
		case 'getAll': {
			const typeId = self.getNodeParameter('flexibleAssetTypeId', index, '') as string;
			if (!typeId) {
				throw new NodeOperationError(
					self.getNode(),
					'getAll Flexible Asset requires "flexibleAssetTypeId" (IT Glue requires filter[flexible-asset-type-id]).',
					{ itemIndex: index },
				);
			}
			const qs: IDataObject = { 'filter[flexible-asset-type-id]': typeId };
			const include = self.getNodeParameter('include', index, []) as string[];
			if (Array.isArray(include) && include.length > 0) {
				qs.include = include.join(',');
			}
			const returnAll = self.getNodeParameter('returnAll', index, false) as boolean;
			let items: IDataObject[];
			if (returnAll) {
				items = await itGlueApiRequestAllItems.call(this, 'GET', 'flexible_assets', {}, qs);
			} else {
				qs['page[size]'] = self.getNodeParameter('limit', index, 50);
				const resp = await itGlueApiRequest.call(this, 'GET', 'flexible_assets', {}, qs);
				items = (resp.data as IDataObject[]) ?? [];
			}
			return this.helpers.returnJsonArray(items.map((r) => flattenResource(r)));
		}

		case 'get': {
			const id = req('flexibleAssetId');
			const qs: IDataObject = {};
			const include = self.getNodeParameter('include', index, []) as string[];
			if (Array.isArray(include) && include.length > 0) {
				qs.include = include.join(',');
			}
			const resp = await itGlueApiRequest.call(this, 'GET', `flexible_assets/${id}`, {}, qs);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for get on Flexible Asset.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'create': {
			const typeId = req('flexibleAssetTypeId');
			const orgId = self.getNodeParameter('organizationId', index, '') as string;
			const traits = collectTraits();
			const attributes: IDataObject = { 'flexible-asset-type-id': typeId, traits };
			if (orgId) attributes['organization-id'] = orgId;
			const body = buildJsonApiBody('flexible-assets', attributes);
			const endpoint = orgId
				? `organizations/${orgId}/relationships/flexible_assets`
				: 'flexible_assets';
			const resp = await itGlueApiRequest.call(this, 'POST', endpoint, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for create on Flexible Asset.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'update': {
			const id = req('flexibleAssetId');
			const traits = collectTraits();
			const typeId = self.getNodeParameter('flexibleAssetTypeId', index, '') as string;
			const attributes: IDataObject = { traits };
			if (typeId) attributes['flexible-asset-type-id'] = typeId;
			const body = buildJsonApiBody('flexible-assets', attributes, undefined, id);
			const resp = await itGlueApiRequest.call(this, 'PATCH', `flexible_assets/${id}`, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for update on Flexible Asset.',
					{ itemIndex: index },
				);
			}
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'delete': {
			const id = req('flexibleAssetId');
			await itGlueApiRequest.call(this, 'DELETE', `flexible_assets/${id}`);
			return this.helpers.returnJsonArray([{ success: true, id }]);
		}

		case 'bulkDelete': {
			const ids = self.getNodeParameter('flexibleAssetIds', index, []) as string[];
			if (!Array.isArray(ids) || ids.length === 0) {
				throw new NodeOperationError(
					self.getNode(),
					'"flexibleAssetIds" must contain at least one ID for bulkDelete.',
					{ itemIndex: index },
				);
			}
			await itGlueApiRequest.call(this, 'DELETE', 'flexible_assets', {
				data: ids.map((id) => ({ type: 'flexible-assets', id: String(id) })),
			});
			return this.helpers.returnJsonArray([{ success: true, deleted: ids }]);
		}

		default: {
			const _exhaustive: never = operation;
			throw new NodeOperationError(
				self.getNode(),
				`Unknown operation "${String(_exhaustive)}" on Flexible Asset.`,
				{ itemIndex: index },
			);
		}
	}
}
