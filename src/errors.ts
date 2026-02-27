import { logger } from "./logger.js";

export class TierError extends Error {
	constructor(toolName: string, requiredTier: string) {
		super(
			`Tool "${toolName}" requires the "${requiredTier}" tier. ` +
				`Current tier is "free". Set X_API_TIER=basic to enable this tool.`,
		);
		this.name = "TierError";
	}
}

export class XApiError extends Error {
	public readonly code: number | undefined;
	public readonly rateLimit: boolean;

	constructor(message: string, code?: number, rateLimit = false) {
		super(message);
		this.name = "XApiError";
		this.code = code;
		this.rateLimit = rateLimit;
	}
}

export function formatError(error: unknown): {
	content: Array<{ type: "text"; text: string }>;
	isError: true;
} {
	let message: string;

	if (error instanceof TierError) {
		message = error.message;
	} else if (error instanceof XApiError) {
		message = error.rateLimit
			? `Rate limited by X API. Please wait and try again. Details: ${error.message}`
			: `X API error: ${error.message}`;
	} else if (error instanceof Error) {
		message = `Unexpected error: ${error.message}`;
		logger.error("Unexpected error", { error: error.message, stack: error.stack });
	} else {
		message = `Unknown error: ${String(error)}`;
		logger.error("Unknown error", { error: String(error) });
	}

	return {
		content: [{ type: "text", text: message }],
		isError: true,
	};
}
