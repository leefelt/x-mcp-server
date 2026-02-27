import { describe, expect, it } from "vitest";
import type { Config } from "../src/config.js";
import { TierError } from "../src/errors.js";
import { assertTier } from "../src/tier.js";

const freeConfig: Config = {
	apiKey: "key",
	apiSecret: "secret",
	accessToken: "token",
	accessTokenSecret: "tokenSecret",
	tier: "free",
};

const basicConfig: Config = {
	...freeConfig,
	tier: "basic",
};

describe("assertTier", () => {
	describe("free tier tools", () => {
		const freeTools = [
			"post_tweet",
			"post_thread",
			"delete_tweet",
			"like_tweet",
			"unlike_tweet",
			"retweet",
			"unretweet",
		];

		for (const tool of freeTools) {
			it(`allows "${tool}" on free tier`, () => {
				expect(() => assertTier(tool, freeConfig)).not.toThrow();
			});

			it(`allows "${tool}" on basic tier`, () => {
				expect(() => assertTier(tool, basicConfig)).not.toThrow();
			});
		}
	});

	describe("basic tier tools", () => {
		const basicTools = ["search_tweets", "get_timeline", "get_user", "get_mentions"];

		for (const tool of basicTools) {
			it(`throws TierError for "${tool}" on free tier`, () => {
				expect(() => assertTier(tool, freeConfig)).toThrow(TierError);
			});

			it(`throws TierError with correct message for "${tool}" on free tier`, () => {
				expect(() => assertTier(tool, freeConfig)).toThrow(
					`Tool "${tool}" requires the "basic" tier`,
				);
			});

			it(`allows "${tool}" on basic tier`, () => {
				expect(() => assertTier(tool, basicConfig)).not.toThrow();
			});
		}
	});

	describe("unknown tools", () => {
		it("does not throw for unknown tool names", () => {
			expect(() => assertTier("unknown_tool", freeConfig)).not.toThrow();
		});
	});
});
