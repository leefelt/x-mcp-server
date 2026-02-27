import type { ClientRequest, IncomingMessage } from "node:http";
import { ApiResponseError } from "twitter-api-v2";
import { describe, expect, it, vi } from "vitest";
import { formatError, TierError, XApiError } from "../src/errors.js";

function createApiResponseError(message: string, code: number): ApiResponseError {
	return new ApiResponseError(message, {
		code,
		request: {} as ClientRequest,
		response: {} as IncomingMessage,
		headers: {},
		data: { errors: [] },
	});
}

// Suppress logger.error stderr output during tests
vi.mock("../src/logger.js", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

describe("formatError", () => {
	it("formats TierError correctly", () => {
		const error = new TierError("search_tweets", "basic");
		const result = formatError(error);

		expect(result.isError).toBe(true);
		expect(result.content).toHaveLength(1);
		expect(result.content[0]?.type).toBe("text");
		expect(result.content[0]?.text).toContain("search_tweets");
		expect(result.content[0]?.text).toContain("basic");
		expect(result.content[0]?.text).toContain("X_API_TIER=basic");
	});

	it("formats XApiError correctly", () => {
		const error = new XApiError("Something went wrong", 403);
		const result = formatError(error);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("X API error: Something went wrong");
	});

	it("formats XApiError with rateLimit=true", () => {
		const error = new XApiError("Too many requests", 429, true);
		const result = formatError(error);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toContain("Rate limited by X API");
		expect(result.content[0]?.text).toContain("Too many requests");
	});

	it("formats ApiResponseError correctly", () => {
		const error = createApiResponseError("Forbidden", 403);
		const result = formatError(error);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("X API error (HTTP 403): Forbidden");
	});

	it("formats ApiResponseError with rate limit (429)", () => {
		const error = createApiResponseError("Too Many Requests", 429);
		const result = formatError(error);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toContain("Rate limited by X API");
		expect(result.content[0]?.text).toContain("Too Many Requests");
	});

	it("formats ApiResponseError with rate limit (420)", () => {
		const error = createApiResponseError("Enhance Your Calm", 420);
		const result = formatError(error);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toContain("Rate limited by X API");
		expect(result.content[0]?.text).toContain("Enhance Your Calm");
	});

	it("formats generic Error", () => {
		const error = new Error("something unexpected");
		const result = formatError(error);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Unexpected error: something unexpected");
	});

	it("formats non-Error values", () => {
		const result = formatError("string error");

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Unknown error: string error");
	});

	it("formats non-Error number value", () => {
		const result = formatError(42);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Unknown error: 42");
	});

	it("formats null value", () => {
		const result = formatError(null);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Unknown error: null");
	});
});

describe("TierError", () => {
	it("has correct name property", () => {
		const error = new TierError("get_user", "basic");
		expect(error.name).toBe("TierError");
	});

	it("is instance of Error", () => {
		const error = new TierError("get_user", "basic");
		expect(error).toBeInstanceOf(Error);
	});
});

describe("XApiError", () => {
	it("has correct name property", () => {
		const error = new XApiError("msg", 400);
		expect(error.name).toBe("XApiError");
	});

	it("stores code", () => {
		const error = new XApiError("msg", 403);
		expect(error.code).toBe(403);
	});

	it("defaults rateLimit to false", () => {
		const error = new XApiError("msg", 400);
		expect(error.rateLimit).toBe(false);
	});

	it("stores rateLimit when set to true", () => {
		const error = new XApiError("msg", 429, true);
		expect(error.rateLimit).toBe(true);
	});

	it("is instance of Error", () => {
		const error = new XApiError("msg");
		expect(error).toBeInstanceOf(Error);
	});
});
