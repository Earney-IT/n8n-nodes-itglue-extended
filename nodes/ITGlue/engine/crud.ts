import { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { FieldDescriptor, OperationName, ResourceDescriptor } from '../registry/types';
import { itGlueApiRequest, itGlueApiRequestAllItems } from '../transport/request';
import { buildJsonApiBody, flattenResource } from './jsonapi';

export async function executeGeneric(
	this: IExecuteFunctions,
	d: ResourceDescriptor,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as OperationName;
	const idParamName = d.idParam ?? d.name + 'Id';

	// Capture context to avoid `this` shadowing in nested functions
	const self = this;

	// Collect JSON:API attributes for create/update operations
	function collectAttributes(): IDataObject {
		const attributes: IDataObject = {};
		for (const f of d.fields as FieldDescriptor[]) {
			const onOps = f.onOperations ?? ['create', 'update'];
			if (!onOps.includes(operation)) continue;
			const v = self.getNodeParameter(f.name, index, undefined);
			// Include if defined and not an empty string on optional fields
			if (v !== undefined && !(v === '' && !f.required)) {
				attributes[f.attribute] = v;
			}
		}
		return attributes;
	}

	// Org-scoped endpoint helper
	const orgId = d.orgScoped
		? (this.getNodeParameter('organizationId', index, '') as string)
		: '';
	function scoped(op: string): string {
		if (d.orgScoped && orgId && (op === 'create' || op === 'getAll')) {
			return `organizations/${orgId}/relationships/${d.endpoint}`;
		}
		return d.endpoint;
	}

	// Build common query string parts (include)
	function buildQs(): IDataObject {
		const qs: IDataObject = {};
		const include = self.getNodeParameter('include', index, []) as string[];
		if (include.length > 0) {
			qs.include = include.join(',');
		}
		return qs;
	}

	// Add filters from getAll filter collection
	function applyFilters(qs: IDataObject): void {
		const filters = self.getNodeParameter('filters', index, {}) as IDataObject;
		for (const key of Object.keys(filters)) {
			// Find the filter descriptor to get its attribute name
			const filterDescriptor = (d.filters ?? []).find((f) => f.name === key);
			const attrKey = filterDescriptor ? filterDescriptor.attribute : key;
			qs[`filter[${attrKey}]`] = filters[key];
		}
	}

	switch (operation) {
		case 'getAll': {
			const endpoint = scoped('getAll');
			const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
			const qs = buildQs();
			applyFilters(qs);
			let items: IDataObject[];
			if (returnAll) {
				items = await itGlueApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);
			} else {
				qs['page[size]'] = this.getNodeParameter('limit', index, 50);
				const resp = await itGlueApiRequest.call(this, 'GET', endpoint, {}, qs);
				items = (resp.data as IDataObject[]) ?? [];
			}
			return this.helpers.returnJsonArray(items.map(flattenResource));
		}

		case 'get': {
			const id = this.getNodeParameter(idParamName, index) as string;
			const qs = buildQs.call(this);
			const resp = await itGlueApiRequest.call(this, 'GET', `${d.endpoint}/${id}`, {}, qs);
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'create': {
			const attributes = collectAttributes.call(this);
			const body = buildJsonApiBody(d.jsonApiType, attributes);
			const resp = await itGlueApiRequest.call(this, 'POST', scoped('create'), body);
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'update': {
			const id = this.getNodeParameter(idParamName, index) as string;
			const attributes = collectAttributes.call(this);
			const body = buildJsonApiBody(d.jsonApiType, attributes, undefined, id);
			const resp = await itGlueApiRequest.call(
				this,
				'PATCH',
				`${d.endpoint}/${id}`,
				body,
			);
			return this.helpers.returnJsonArray([flattenResource(resp.data as IDataObject)]);
		}

		case 'delete': {
			const id = this.getNodeParameter(idParamName, index) as string;
			await itGlueApiRequest.call(this, 'DELETE', `${d.endpoint}/${id}`);
			return this.helpers.returnJsonArray([{ success: true, id }]);
		}

		case 'bulkUpdate': {
			const items = this.getNodeParameter('bulkItems', index, []) as IDataObject[];
			const body: IDataObject = {
				data: items.map((it) => {
					const { id, ...attrs } = it as Record<string, unknown>;
					return { type: d.jsonApiType, id: String(id), attributes: attrs };
				}),
			};
			const resp = await itGlueApiRequest.call(this, 'PATCH', d.endpoint, body);
			const data = (resp.data as IDataObject[]) ?? [];
			return this.helpers.returnJsonArray(data.map(flattenResource));
		}

		case 'bulkDelete': {
			const ids = this.getNodeParameter('bulkIds', index, []) as string[];
			const body: IDataObject = {
				data: ids.map((id) => ({ type: d.jsonApiType, id: String(id) })),
			};
			await itGlueApiRequest.call(this, 'DELETE', d.endpoint, body);
			return this.helpers.returnJsonArray([{ success: true, deleted: ids }]);
		}

		default: {
			const _exhaustive: never = operation;
			throw new Error(`Unknown operation: ${String(_exhaustive)}`);
		}
	}
}
