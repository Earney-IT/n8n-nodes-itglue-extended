import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import { itGlueApiRequest, itGlueApiRequestAllItems } from '../../transport/request';
import { buildJsonApiBody, flattenResource } from '../../engine/jsonapi';
import { redactSecrets } from '../../engine/redact';
import { canRevealPlaintext } from '../../engine/revealGate';

/**
 * SECURITY-CRITICAL special handler for IT Glue Passwords.
 *
 * Plaintext passwords / OTP secrets MUST NEVER reach an LLM. Reveal is
 * fail-closed: it is permitted ONLY for single-record reads (get / getVersion)
 * AND only when the fail-closed reveal gate (`canRevealPlaintext`) says yes
 * AND an INDEPENDENT defense-in-depth backstop confirms the official n8n
 * `isToolExecution()` signal is present and explicitly `false`.
 *
 * Every non-revealed path runs the response through `redactSecrets` before it
 * leaves this node. `show_password` is sent to IT Glue ONLY when `reveal===true`.
 */

type PasswordOperation =
	| 'getAll'
	| 'get'
	| 'create'
	| 'update'
	| 'delete'
	| 'archive'
	| 'restore'
	| 'getVersions'
	| 'getVersion';

// n8n param name -> IT Glue kebab-case JSON:API attribute. Included on
// create/update only when the param is present and not the empty string.
const ATTRIBUTE_MAP: Record<string, string> = {
	name: 'name',
	username: 'username',
	password: 'password',
	url: 'url',
	notes: 'notes',
	passwordCategoryId: 'password-category-id',
	passwordFolderId: 'password-folder-id',
	restricted: 'restricted',
	otpSecret: 'otp-secret',
	otpEnabled: 'otp-enabled',
	resourceUrl: 'resource-url',
	organizationId: 'organization-id',
};

export async function executePassword(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const operation = this.getNodeParameter('operation', index) as PasswordOperation;
	const self = this;

	// ---- Reveal decision (security core) -----------------------------------
	const single = operation === 'get' || operation === 'getVersion';
	let reveal = single && canRevealPlaintext(this, index);

	// DEFENSE-IN-DEPTH backstop independent of the gate: the official n8n
	// signal must be PRESENT and explicitly false; absent/non-false/throw ⇒
	// treat as a tool ⇒ no reveal. This intentionally overlaps the gate; it
	// is the single-point-of-failure mitigation per the security review and
	// MUST NOT be removed.
	let toolish: boolean;
	try {
		const f = (this as unknown as { isToolExecution?: () => boolean }).isToolExecution;
		toolish = typeof f === 'function' ? f.call(this) !== false : true;
	} catch {
		toolish = true;
	}
	if (toolish) reveal = false;

	// ---- Helpers -----------------------------------------------------------
	const orgId = this.getNodeParameter('organizationId', index, '') as string;

	function requireId(name: string): string {
		const raw = self.getNodeParameter(name, index, '');
		const value = raw as unknown;
		if ((!value && value !== 0 && value !== '0') || value === '') {
			throw new NodeOperationError(
				self.getNode(),
				`"${name}" is required for "${operation}" on Password.`,
				{ itemIndex: index },
			);
		}
		return String(value);
	}

	function collectAttributes(): IDataObject {
		const attributes: IDataObject = {};
		for (const param of Object.keys(ATTRIBUTE_MAP)) {
			const v = self.getNodeParameter(param, index, undefined) as unknown;
			if (v === undefined || v === null) continue;
			if (v === '') continue; // empty string only is skipped
			attributes[ATTRIBUTE_MAP[param]] = v as IDataObject[string];
		}
		return attributes;
	}

	function buildListQs(): IDataObject {
		const qs: IDataObject = {};
		const filters = self.getNodeParameter('filters', index, {}) as IDataObject;
		for (const k of Object.keys(filters)) {
			const val = filters[k];
			if (val === '' || val === undefined || val === null) continue;
			qs[`filter[${k}]`] = val;
		}
		const include = self.getNodeParameter('include', index, []) as string[];
		if (Array.isArray(include) && include.length > 0) {
			qs.include = include.join(',');
		}
		return qs;
	}

	function addInclude(qs: IDataObject): void {
		const include = self.getNodeParameter('include', index, []) as string[];
		if (Array.isArray(include) && include.length > 0) {
			qs.include = include.join(',');
		}
	}

	// Reason attached whenever a record set is redacted instead of revealed.
	const redactedReason = toolish
		? 'blocked in AI/tool context'
		: operation === 'getAll' || operation === 'getVersions'
			? 'bulk reveal not permitted'
			: 'reveal not enabled';

	function finalizeSingle(item: IDataObject): IDataObject {
		if (reveal) {
			return { ...item, _passwordRevealed: true };
		}
		return { ...redactSecrets(item), _passwordRedactedReason: redactedReason };
	}

	function finalizeList(items: IDataObject[]): IDataObject[] {
		// reveal can never be true here (bulk ⇒ single===false).
		return items.map((i) => ({ ...redactSecrets(i), _passwordRedactedReason: redactedReason }));
	}

	switch (operation) {
		case 'getAll': {
			const endpoint = orgId
				? `organizations/${orgId}/relationships/passwords`
				: 'passwords';
			const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
			const qs = buildListQs(); // NEVER sets show_password
			let items: IDataObject[];
			if (returnAll) {
				items = await itGlueApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);
			} else {
				qs['page[size]'] = this.getNodeParameter('limit', index, 50);
				const resp = await itGlueApiRequest.call(this, 'GET', endpoint, {}, qs);
				items = (resp.data as IDataObject[]) ?? [];
			}
			const flat = items.map((r) => flattenResource(r));
			return this.helpers.returnJsonArray(finalizeList(flat));
		}

		case 'get': {
			const id = requireId('passwordId');
			const qs: IDataObject = reveal ? { show_password: true } : {};
			addInclude(qs);
			const resp = await itGlueApiRequest.call(this, 'GET', `passwords/${id}`, {}, qs);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for get on Password',
					{ itemIndex: index },
				);
			}
			const item = flattenResource(resp.data as IDataObject);
			return this.helpers.returnJsonArray([finalizeSingle(item)]);
		}

		case 'create': {
			const attributes = collectAttributes();
			const body = buildJsonApiBody('passwords', attributes);
			const endpoint = orgId
				? `organizations/${orgId}/relationships/passwords`
				: 'passwords';
			const resp = await itGlueApiRequest.call(this, 'POST', endpoint, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for create on Password',
					{ itemIndex: index },
				);
			}
			// create/update responses are NEVER revealed (reveal only applies
			// to get/getVersion ⇒ single===false here ⇒ reveal===false).
			const item = flattenResource(resp.data as IDataObject);
			return this.helpers.returnJsonArray([finalizeSingle(item)]);
		}

		case 'update': {
			const id = requireId('passwordId');
			const attributes = collectAttributes();
			const body = buildJsonApiBody('passwords', attributes, undefined, id);
			const resp = await itGlueApiRequest.call(this, 'PATCH', `passwords/${id}`, body);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for update on Password',
					{ itemIndex: index },
				);
			}
			const item = flattenResource(resp.data as IDataObject);
			return this.helpers.returnJsonArray([finalizeSingle(item)]);
		}

		case 'delete': {
			const id = requireId('passwordId');
			await itGlueApiRequest.call(this, 'DELETE', `passwords/${id}`);
			return this.helpers.returnJsonArray([{ success: true, id }]);
		}

		case 'archive': {
			const id = requireId('passwordId');
			const body = buildJsonApiBody('passwords', { archived: true }, undefined, id);
			const resp = await itGlueApiRequest.call(this, 'PATCH', `passwords/${id}`, body);
			const item = flattenResource((resp.data as IDataObject) ?? {});
			return this.helpers.returnJsonArray([finalizeSingle(item)]);
		}

		case 'restore': {
			const id = requireId('passwordId');
			const body = buildJsonApiBody('passwords', { archived: false }, undefined, id);
			const resp = await itGlueApiRequest.call(this, 'PATCH', `passwords/${id}`, body);
			const item = flattenResource((resp.data as IDataObject) ?? {});
			return this.helpers.returnJsonArray([finalizeSingle(item)]);
		}

		case 'getVersions': {
			const id = requireId('passwordId');
			const endpoint = `passwords/${id}/relationships/password_versions`;
			const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
			const qs: IDataObject = {}; // bulk ⇒ NEVER show_password
			let items: IDataObject[];
			if (returnAll) {
				items = await itGlueApiRequestAllItems.call(this, 'GET', endpoint, {}, qs);
			} else {
				qs['page[size]'] = this.getNodeParameter('limit', index, 50);
				const resp = await itGlueApiRequest.call(this, 'GET', endpoint, {}, qs);
				items = (resp.data as IDataObject[]) ?? [];
			}
			const flat = items.map((r) => flattenResource(r));
			return this.helpers.returnJsonArray(finalizeList(flat));
		}

		case 'getVersion': {
			const vid = requireId('versionId');
			const qs: IDataObject = reveal ? { show_password: true } : {};
			const resp = await itGlueApiRequest.call(
				this,
				'GET',
				`password_versions/${vid}`,
				{},
				qs,
			);
			if (!resp.data) {
				throw new NodeOperationError(
					self.getNode(),
					'IT Glue returned no data for getVersion on Password',
					{ itemIndex: index },
				);
			}
			const item = flattenResource(resp.data as IDataObject);
			return this.helpers.returnJsonArray([finalizeSingle(item)]);
		}

		default: {
			const _exhaustive: never = operation;
			throw new NodeOperationError(
				self.getNode(),
				`Unknown operation "${String(_exhaustive)}" on Password.`,
				{ itemIndex: index },
			);
		}
	}
}
