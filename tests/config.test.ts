import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("succeeds with all env vars set", () => {
		process.env.X_API_KEY = "key";
		process.env.X_API_SECRET = "secret";
		process.env.X_ACCESS_TOKEN = "token";
		process.env.X_ACCESS_TOKEN_SECRET = "tokenSecret";
		process.env.X_API_TIER = "free";

		const config = loadConfig();

		expect(config).toEqual({
			apiKey: "key",
			apiSecret: "secret",
			accessToken: "token",
			accessTokenSecret: "tokenSecret",
			tier: "free",
		});
	});

	it("fails when X_API_KEY is missing", () => {
		process.env.X_API_SECRET = "secret";
		process.env.X_ACCESS_TOKEN = "token";
		process.env.X_ACCESS_TOKEN_SECRET = "tokenSecret";
		delete process.env.X_API_KEY;

		expect(() => loadConfig()).toThrow();
	});

	it("fails when X_API_SECRET is missing", () => {
		process.env.X_API_KEY = "key";
		process.env.X_ACCESS_TOKEN = "token";
		process.env.X_ACCESS_TOKEN_SECRET = "tokenSecret";
		delete process.env.X_API_SECRET;

		expect(() => loadConfig()).toThrow();
	});

	it("fails when X_ACCESS_TOKEN is missing", () => {
		process.env.X_API_KEY = "key";
		process.env.X_API_SECRET = "secret";
		process.env.X_ACCESS_TOKEN_SECRET = "tokenSecret";
		delete process.env.X_ACCESS_TOKEN;

		expect(() => loadConfig()).toThrow();
	});

	it("fails when X_ACCESS_TOKEN_SECRET is missing", () => {
		process.env.X_API_KEY = "key";
		process.env.X_API_SECRET = "secret";
		process.env.X_ACCESS_TOKEN = "token";
		delete process.env.X_ACCESS_TOKEN_SECRET;

		expect(() => loadConfig()).toThrow();
	});

	it("defaults tier to 'free' when X_API_TIER is not set", () => {
		process.env.X_API_KEY = "key";
		process.env.X_API_SECRET = "secret";
		process.env.X_ACCESS_TOKEN = "token";
		process.env.X_ACCESS_TOKEN_SECRET = "tokenSecret";
		delete process.env.X_API_TIER;

		const config = loadConfig();

		expect(config.tier).toBe("free");
	});

	it("accepts tier 'basic'", () => {
		process.env.X_API_KEY = "key";
		process.env.X_API_SECRET = "secret";
		process.env.X_ACCESS_TOKEN = "token";
		process.env.X_ACCESS_TOKEN_SECRET = "tokenSecret";
		process.env.X_API_TIER = "basic";

		const config = loadConfig();

		expect(config.tier).toBe("basic");
	});

	it("rejects invalid tier values", () => {
		process.env.X_API_KEY = "key";
		process.env.X_API_SECRET = "secret";
		process.env.X_ACCESS_TOKEN = "token";
		process.env.X_ACCESS_TOKEN_SECRET = "tokenSecret";
		process.env.X_API_TIER = "premium";

		expect(() => loadConfig()).toThrow();
	});
});
