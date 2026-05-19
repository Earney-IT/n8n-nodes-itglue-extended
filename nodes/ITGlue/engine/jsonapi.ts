import type { IDataObject } from 'n8n-workflow';

// Converts camelCase n8n params to IT Glue's kebab-case JSON:API attributes.
// Assumes single-capital humps (organizationId -> organization-id). All-caps
// acronyms (e.g. "IPAddress") would NOT round-trip; no such attribute exists
// in the IT Glue API surface this node targets, so this is acceptable.
export function camelToKebab(s: string): string {
	return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// Converts IT Glue's kebab-case JSON:API attributes back to camelCase n8n params.
// Assumes single-capital humps (organization-id -> organizationId). All-caps
// acronyms (e.g. "IPAddress") would NOT round-trip; no such attribute exists
// in the IT Glue API surface this node targets, so this is acceptable.
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
	// id/type/relationships spread last so real resource identifiers always win.
	return {
		...converted,
		id: item.id,
		type: item.type,
		...(item.relationships ? { relationships: item.relationships } : {}),
	};
}
