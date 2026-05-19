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
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'itglueApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw toNodeError(this, error);
	}
}
