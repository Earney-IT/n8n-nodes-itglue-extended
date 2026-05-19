import type { IDataObject } from 'n8n-workflow';

export function camelToKebab(s: string): string {
	return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

export function kebabToCamel(s: string): string {
	return s.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

export function buildJsonApiBody(
	type: string,
	attributes: IDataObject,
	relationships?: IDataObject,
	id?: string,
): IDataObject {
	return {
		data: {
			type,
			...(id !== undefined ? { id } : {}),
			attributes,
			...(relationships !== undefined ? { relationships } : {}),
		},
	};
}

export function flattenResource(item: IDataObject): IDataObject {
	const attrs = (item.attributes ?? {}) as Record<string, unknown>;
	const converted: Record<string, unknown> = {};
	for (const key of Object.keys(attrs)) {
		converted[kebabToCamel(key)] = attrs[key];
	}
	return {
		id: item.id,
		type: item.type,
		...converted,
		...(item.relationships ? { relationships: item.relationships } : {}),
	};
}
