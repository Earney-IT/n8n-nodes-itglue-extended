import {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	NodeOperationError,
} from 'n8n-workflow';
import { toNodeError } from './errors';
import { withRetry } from './rateLimit';

type ITGlueCtx =
	| IExecuteFunctions
	| IExecuteSingleFunctions
	| ILoadOptionsFunctions
	| IPollFunctions
	| IHookFunctions;

export async function itGlueApiRequest(
	this: ITGlueCtx,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const creds = await this.getCredentials('itglueApi');
	const region = creds.region;
	if (!region) {
		throw new NodeOperationError(this.getNode(), 'IT Glue credential is missing the "region" field.');
	}
	const path = String(resource).replace(/^\/+/, '');
	const url = `https://${String(region)}.itglue.com/${path}`;

	const options: IHttpRequestOptions = {
		method,
		url,
		qs,
		json: true,
		headers: {
			Accept: 'application/json',
		},
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}

	try {
		return (await withRetry(() =>
			this.helpers.httpRequestWithAuthentication.call(this, 'itglueApi', options),
		)) as IDataObject;
	} catch (error) {
		throw toNodeError(this, error);
	}
}

export async function itGlueApiRequestAllItems(
	this: ITGlueCtx,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const pageSize = Number(qs['page[size]'] ?? 1000) || 1000;
	const query: IDataObject = { ...qs, 'page[size]': pageSize };
	const MAX_PAGES = 200;
	let pageNumber = 1;
	const out: IDataObject[] = [];
	for (;;) {
		if (pageNumber > MAX_PAGES) {
			throw new NodeOperationError(
				(this as IExecuteFunctions).getNode(),
				`IT Glue returned more than ${MAX_PAGES} pages. Add filters to narrow the result set.`,
			);
		}
		query['page[number]'] = pageNumber;
		const resp = await itGlueApiRequest.call(this, method, resource, body, query);
		const data = (resp.data as IDataObject[]) ?? [];
		out.push(...data);
		if (data.length < pageSize) break;
		pageNumber++;
	}
	return out;
}
