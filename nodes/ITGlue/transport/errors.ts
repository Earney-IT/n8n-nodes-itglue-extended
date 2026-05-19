import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { INode, JsonObject } from 'n8n-workflow';

type MinimalCtx = { getNode: () => INode };

export function toNodeError(ctx: MinimalCtx, error: any): never {
	if (error.response) {
		const status: number = error.response.status as number;
		const detail: string =
			(error.response?.data?.errors?.[0]?.detail as string | undefined) ??
			(error?.message as string | undefined) ??
			'No detail available';

		// Cast to JsonObject for NodeApiError — runtime error objects satisfy the index signature
		const errorObj = error as unknown as JsonObject;

		switch (status) {
			case 401:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `IT Glue API Error (401): Authentication failed. Check your IT Glue API key and region. (${detail})`,
					httpCode: '401',
				});
			case 403:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `IT Glue API Error (403): Access forbidden. Your API key may lack permission for this operation. (${detail})`,
					httpCode: '403',
				});
			// Reached only when Task 7's retry wrapper has exhausted retries.
			case 429:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `IT Glue API Error (429): Rate limit exceeded. IT Glue is throttling requests; retry later. (${detail})`,
					httpCode: '429',
				});
			default:
				throw new NodeApiError(ctx.getNode(), errorObj, {
					message: `IT Glue API Error (${status}): ${detail}`,
					httpCode: String(status),
				});
		}
	}

	throw new NodeOperationError(ctx.getNode(), `IT Glue request failed: ${(error?.message as string | undefined) ?? 'No error message available'}`);
}
