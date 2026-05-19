export interface RetryOptions {
	retries?: number;                       // max retries after the first attempt (default 3)
	sleep?: (ms: number) => Promise<void>;  // injectable for tests (default real timer)
}

const realSleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

function is429(error: unknown): boolean {
	return !!(error as { response?: { status?: number } })?.response &&
		(error as { response?: { status?: number } }).response!.status === 429;
}

function retryAfterMs(error: unknown, attempt: number): number {
	const hdr = (error as { response?: { headers?: Record<string, unknown> } })?.response?.headers;
	const ra = hdr ? (hdr['retry-after'] ?? hdr['Retry-After']) : undefined;
	const secs = ra !== undefined ? Number(ra) : NaN;
	if (!Number.isNaN(secs)) return Math.min(Math.max(0, secs) * 1000, 60_000);
	// exponential backoff fallback: 1s, 2s, 4s ...
	return Math.min(2 ** attempt * 1000, 30000);
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const retries = options.retries ?? 3;
	const sleep = options.sleep ?? realSleep;
	let attempt = 0;
	for (;;) {
		try {
			return await fn();
		} catch (error) {
			if (!is429(error) || attempt >= retries) throw error;
			await sleep(retryAfterMs(error, attempt));
			attempt++;
		}
	}
}
