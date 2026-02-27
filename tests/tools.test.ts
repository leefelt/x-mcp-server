import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClient } from "../src/client.js";
import type { Config } from "../src/config.js";

// ─── Mock twitter-api-v2 ────────────────────────────────────────────────────

const mockTweet = vi.fn();
const mockDeleteTweet = vi.fn();
const mockLike = vi.fn();
const mockUnlike = vi.fn();
const mockRetweet = vi.fn();
const mockUnretweet = vi.fn();
const mockSearch = vi.fn();
const mockUserTimeline = vi.fn();
const mockUserMentionTimeline = vi.fn();
const mockUserByUsername = vi.fn();
const mockMe = vi.fn();

vi.mock("twitter-api-v2", () => ({
	TwitterApi: vi.fn().mockImplementation(() => ({
		v2: {
			tweet: mockTweet,
			deleteTweet: mockDeleteTweet,
			like: mockLike,
			unlike: mockUnlike,
			retweet: mockRetweet,
			unretweet: mockUnretweet,
			search: mockSearch,
			userTimeline: mockUserTimeline,
			userMentionTimeline: mockUserMentionTimeline,
			userByUsername: mockUserByUsername,
			me: mockMe,
		},
	})),
}));

// Suppress logger stderr output during tests
vi.mock("../src/logger.js", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

// ─── Imports (must come after vi.mock) ──────────────────────────────────────

import { registerDeleteTweet } from "../src/tools/delete-tweet.js";
import { registerGetMentions } from "../src/tools/get-mentions.js";
import { registerGetTimeline } from "../src/tools/get-timeline.js";
import { registerGetUser } from "../src/tools/get-user.js";
import { registerLikeTweet, registerUnlikeTweet } from "../src/tools/like-tweet.js";
import { registerPostThread } from "../src/tools/post-thread.js";
import { registerPostTweet } from "../src/tools/post-tweet.js";
import { registerRetweet, registerUnretweet } from "../src/tools/retweet.js";
import { registerSearchTweets } from "../src/tools/search-tweets.js";

// ─── Test helpers ───────────────────────────────────────────────────────────

type ToolHandler = (args: Record<string, unknown>) => Promise<{
	content: Array<{ type: "text"; text: string }>;
	isError?: true;
}>;

function captureTool(
	registerFn: (server: McpServer, config: Config) => void,
	config: Config,
): ToolHandler {
	let handler: ToolHandler | undefined;
	const fakeServer = {
		tool: (_name: string, _desc: string, _schema: unknown, fn: ToolHandler) => {
			handler = fn;
		},
	} as unknown as McpServer;
	registerFn(fakeServer, config);
	if (!handler) throw new Error("Tool handler was not registered");
	return handler;
}

function parseContent(result: { content: Array<{ type: "text"; text: string }> }): unknown {
	const first = result.content[0];
	if (!first) throw new Error("No content returned");
	return JSON.parse(first.text);
}

function getTextContent(result: { content: Array<{ type: "text"; text: string }> }): string {
	const first = result.content[0];
	if (!first) throw new Error("No content returned");
	return first.text;
}

// ─── Configs ────────────────────────────────────────────────────────────────

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

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	resetClient();
	mockMe.mockResolvedValue({ data: { id: "12345" } });
});

// ─── post_tweet ─────────────────────────────────────────────────────────────

describe("post_tweet", () => {
	it("posts a tweet and returns id, text, url", async () => {
		mockTweet.mockResolvedValue({
			data: { id: "111", text: "Hello world" },
		});

		const handler = captureTool(registerPostTweet, freeConfig);
		const result = await handler({ text: "Hello world" });
		const data = parseContent(result) as Record<string, unknown>;

		expect(mockTweet).toHaveBeenCalledWith("Hello world");
		expect(data).toEqual({
			id: "111",
			text: "Hello world",
			url: "https://x.com/i/status/111",
		});
		expect(result.isError).toBeUndefined();
	});

	it("is allowed on free tier", async () => {
		mockTweet.mockResolvedValue({
			data: { id: "111", text: "test" },
		});

		const handler = captureTool(registerPostTweet, freeConfig);
		const result = await handler({ text: "test" });

		expect(result.isError).toBeUndefined();
	});

	it("is allowed on basic tier", async () => {
		mockTweet.mockResolvedValue({
			data: { id: "111", text: "test" },
		});

		const handler = captureTool(registerPostTweet, basicConfig);
		const result = await handler({ text: "test" });

		expect(result.isError).toBeUndefined();
	});

	it("returns formatted error when API fails", async () => {
		mockTweet.mockRejectedValue(new Error("API failure"));

		const handler = captureTool(registerPostTweet, freeConfig);
		const result = await handler({ text: "test" });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("Unexpected error");
	});
});

// ─── post_thread ────────────────────────────────────────────────────────────

describe("post_thread", () => {
	it("posts 3 tweets chained by reply", async () => {
		mockTweet
			.mockResolvedValueOnce({ data: { id: "1", text: "First" } })
			.mockResolvedValueOnce({ data: { id: "2", text: "Second" } })
			.mockResolvedValueOnce({ data: { id: "3", text: "Third" } });

		const handler = captureTool(registerPostThread, freeConfig);
		const result = await handler({ tweets: ["First", "Second", "Third"] });
		const data = parseContent(result) as {
			thread_length: number;
			tweets: Array<{ id: string; text: string; url: string }>;
		};

		expect(data.thread_length).toBe(3);
		expect(data.tweets).toHaveLength(3);
		expect(data.tweets[0]).toEqual({
			id: "1",
			text: "First",
			url: "https://x.com/i/status/1",
		});
		expect(data.tweets[2]).toEqual({
			id: "3",
			text: "Third",
			url: "https://x.com/i/status/3",
		});

		// First tweet has no reply
		expect(mockTweet).toHaveBeenNthCalledWith(1, { text: "First" });
		// Second tweet replies to first
		expect(mockTweet).toHaveBeenNthCalledWith(2, {
			text: "Second",
			reply: { in_reply_to_tweet_id: "1" },
		});
		// Third tweet replies to second
		expect(mockTweet).toHaveBeenNthCalledWith(3, {
			text: "Third",
			reply: { in_reply_to_tweet_id: "2" },
		});
	});

	it("is allowed on free tier", async () => {
		mockTweet
			.mockResolvedValueOnce({ data: { id: "1", text: "A" } })
			.mockResolvedValueOnce({ data: { id: "2", text: "B" } });

		const handler = captureTool(registerPostThread, freeConfig);
		const result = await handler({ tweets: ["A", "B"] });

		expect(result.isError).toBeUndefined();
	});

	it("returns error when a tweet in the thread fails", async () => {
		mockTweet
			.mockResolvedValueOnce({ data: { id: "1", text: "First" } })
			.mockRejectedValueOnce(new Error("Rate limit"));

		const handler = captureTool(registerPostThread, freeConfig);
		const result = await handler({ tweets: ["First", "Second"] });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("Rate limit");
	});
});

// ─── delete_tweet ───────────────────────────────────────────────────────────

describe("delete_tweet", () => {
	it("deletes a tweet and returns confirmation", async () => {
		mockDeleteTweet.mockResolvedValue({ data: { deleted: true } });

		const handler = captureTool(registerDeleteTweet, freeConfig);
		const result = await handler({ tweet_id: "999" });
		const data = parseContent(result) as Record<string, unknown>;

		expect(mockDeleteTweet).toHaveBeenCalledWith("999");
		expect(data).toEqual({ deleted: true, tweet_id: "999" });
		expect(result.isError).toBeUndefined();
	});

	it("is allowed on free tier", async () => {
		mockDeleteTweet.mockResolvedValue({ data: { deleted: true } });

		const handler = captureTool(registerDeleteTweet, freeConfig);
		const result = await handler({ tweet_id: "999" });

		expect(result.isError).toBeUndefined();
	});

	it("returns error when deletion fails", async () => {
		mockDeleteTweet.mockRejectedValue(new Error("Not found"));

		const handler = captureTool(registerDeleteTweet, freeConfig);
		const result = await handler({ tweet_id: "999" });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("Not found");
	});
});

// ─── like_tweet ─────────────────────────────────────────────────────────────

describe("like_tweet", () => {
	it("likes a tweet using authenticated user ID", async () => {
		mockLike.mockResolvedValue({ data: { liked: true } });

		const handler = captureTool(registerLikeTweet, freeConfig);
		const result = await handler({ tweet_id: "555" });
		const data = parseContent(result) as Record<string, unknown>;

		expect(mockMe).toHaveBeenCalled();
		expect(mockLike).toHaveBeenCalledWith("12345", "555");
		expect(data).toEqual({ liked: true, tweet_id: "555" });
		expect(result.isError).toBeUndefined();
	});

	it("is allowed on free tier", async () => {
		mockLike.mockResolvedValue({ data: { liked: true } });

		const handler = captureTool(registerLikeTweet, freeConfig);
		const result = await handler({ tweet_id: "555" });

		expect(result.isError).toBeUndefined();
	});

	it("returns error when like fails", async () => {
		mockLike.mockRejectedValue(new Error("Already liked"));

		const handler = captureTool(registerLikeTweet, freeConfig);
		const result = await handler({ tweet_id: "555" });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("Already liked");
	});
});

// ─── unlike_tweet ───────────────────────────────────────────────────────────

describe("unlike_tweet", () => {
	it("unlikes a tweet using authenticated user ID", async () => {
		mockUnlike.mockResolvedValue({ data: { liked: false } });

		const handler = captureTool(registerUnlikeTweet, freeConfig);
		const result = await handler({ tweet_id: "555" });
		const data = parseContent(result) as Record<string, unknown>;

		expect(mockMe).toHaveBeenCalled();
		expect(mockUnlike).toHaveBeenCalledWith("12345", "555");
		expect(data).toEqual({ unliked: true, tweet_id: "555" });
		expect(result.isError).toBeUndefined();
	});

	it("is allowed on free tier", async () => {
		mockUnlike.mockResolvedValue({ data: { liked: false } });

		const handler = captureTool(registerUnlikeTweet, freeConfig);
		const result = await handler({ tweet_id: "555" });

		expect(result.isError).toBeUndefined();
	});

	it("returns error when unlike fails", async () => {
		mockUnlike.mockRejectedValue(new Error("Not liked"));

		const handler = captureTool(registerUnlikeTweet, freeConfig);
		const result = await handler({ tweet_id: "555" });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("Not liked");
	});
});

// ─── retweet ────────────────────────────────────────────────────────────────

describe("retweet", () => {
	it("retweets using authenticated user ID", async () => {
		mockRetweet.mockResolvedValue({ data: { retweeted: true } });

		const handler = captureTool(registerRetweet, freeConfig);
		const result = await handler({ tweet_id: "777" });
		const data = parseContent(result) as Record<string, unknown>;

		expect(mockMe).toHaveBeenCalled();
		expect(mockRetweet).toHaveBeenCalledWith("12345", "777");
		expect(data).toEqual({ retweeted: true, tweet_id: "777" });
		expect(result.isError).toBeUndefined();
	});

	it("is allowed on free tier", async () => {
		mockRetweet.mockResolvedValue({ data: { retweeted: true } });

		const handler = captureTool(registerRetweet, freeConfig);
		const result = await handler({ tweet_id: "777" });

		expect(result.isError).toBeUndefined();
	});

	it("returns error when retweet fails", async () => {
		mockRetweet.mockRejectedValue(new Error("Already retweeted"));

		const handler = captureTool(registerRetweet, freeConfig);
		const result = await handler({ tweet_id: "777" });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("Already retweeted");
	});
});

// ─── unretweet ──────────────────────────────────────────────────────────────

describe("unretweet", () => {
	it("unretweets using authenticated user ID", async () => {
		mockUnretweet.mockResolvedValue({ data: { retweeted: false } });

		const handler = captureTool(registerUnretweet, freeConfig);
		const result = await handler({ tweet_id: "777" });
		const data = parseContent(result) as Record<string, unknown>;

		expect(mockMe).toHaveBeenCalled();
		expect(mockUnretweet).toHaveBeenCalledWith("12345", "777");
		expect(data).toEqual({ unretweeted: true, tweet_id: "777" });
		expect(result.isError).toBeUndefined();
	});

	it("is allowed on free tier", async () => {
		mockUnretweet.mockResolvedValue({ data: { retweeted: false } });

		const handler = captureTool(registerUnretweet, freeConfig);
		const result = await handler({ tweet_id: "777" });

		expect(result.isError).toBeUndefined();
	});

	it("returns error when unretweet fails", async () => {
		mockUnretweet.mockRejectedValue(new Error("Not retweeted"));

		const handler = captureTool(registerUnretweet, freeConfig);
		const result = await handler({ tweet_id: "777" });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("Not retweeted");
	});
});

// ─── search_tweets (basic tier) ─────────────────────────────────────────────

describe("search_tweets", () => {
	it("returns search results on basic tier", async () => {
		mockSearch.mockResolvedValue({
			data: {
				data: [
					{
						id: "t1",
						text: "Tweet 1",
						created_at: "2025-01-01T00:00:00Z",
						author_id: "a1",
						public_metrics: { like_count: 5 },
					},
					{
						id: "t2",
						text: "Tweet 2",
						created_at: "2025-01-02T00:00:00Z",
						author_id: "a2",
						public_metrics: { like_count: 10 },
					},
				],
			},
		});

		const handler = captureTool(registerSearchTweets, basicConfig);
		const result = await handler({ query: "test query", max_results: 10 });
		const data = parseContent(result) as {
			result_count: number;
			tweets: Array<Record<string, unknown>>;
		};

		expect(mockSearch).toHaveBeenCalledWith("test query", {
			max_results: 10,
			"tweet.fields": ["created_at", "author_id", "public_metrics"],
		});
		expect(data.result_count).toBe(2);
		expect(data.tweets).toHaveLength(2);
		expect(data.tweets[0]).toEqual({
			id: "t1",
			text: "Tweet 1",
			created_at: "2025-01-01T00:00:00Z",
			author_id: "a1",
			metrics: { like_count: 5 },
			url: "https://x.com/i/status/t1",
		});
		expect(result.isError).toBeUndefined();
	});

	it("is blocked on free tier", async () => {
		const handler = captureTool(registerSearchTweets, freeConfig);
		const result = await handler({ query: "test", max_results: 10 });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("search_tweets");
		expect(getTextContent(result)).toContain("basic");
		expect(mockSearch).not.toHaveBeenCalled();
	});

	it("handles empty results", async () => {
		mockSearch.mockResolvedValue({
			data: { data: undefined },
		});

		const handler = captureTool(registerSearchTweets, basicConfig);
		const result = await handler({ query: "nothing", max_results: 10 });
		const data = parseContent(result) as { result_count: number; tweets: unknown[] };

		expect(data.result_count).toBe(0);
		expect(data.tweets).toEqual([]);
	});
});

// ─── get_timeline (basic tier) ──────────────────────────────────────────────

describe("get_timeline", () => {
	it("returns timeline on basic tier", async () => {
		mockUserTimeline.mockResolvedValue({
			data: {
				data: [
					{
						id: "t1",
						text: "Timeline tweet",
						created_at: "2025-01-01T00:00:00Z",
						public_metrics: { like_count: 3 },
					},
				],
			},
		});

		const handler = captureTool(registerGetTimeline, basicConfig);
		const result = await handler({ max_results: 20 });
		const data = parseContent(result) as {
			result_count: number;
			tweets: Array<Record<string, unknown>>;
		};

		expect(mockMe).toHaveBeenCalled();
		expect(mockUserTimeline).toHaveBeenCalledWith("12345", {
			max_results: 20,
			"tweet.fields": ["created_at", "public_metrics"],
		});
		expect(data.result_count).toBe(1);
		expect(data.tweets[0]).toEqual({
			id: "t1",
			text: "Timeline tweet",
			created_at: "2025-01-01T00:00:00Z",
			metrics: { like_count: 3 },
			url: "https://x.com/i/status/t1",
		});
	});

	it("is blocked on free tier", async () => {
		const handler = captureTool(registerGetTimeline, freeConfig);
		const result = await handler({ max_results: 20 });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("get_timeline");
		expect(getTextContent(result)).toContain("basic");
		expect(mockUserTimeline).not.toHaveBeenCalled();
	});

	it("handles empty timeline", async () => {
		mockUserTimeline.mockResolvedValue({
			data: { data: undefined },
		});

		const handler = captureTool(registerGetTimeline, basicConfig);
		const result = await handler({ max_results: 20 });
		const data = parseContent(result) as { result_count: number; tweets: unknown[] };

		expect(data.result_count).toBe(0);
		expect(data.tweets).toEqual([]);
	});
});

// ─── get_user (basic tier) ──────────────────────────────────────────────────

describe("get_user", () => {
	it("returns user profile on basic tier", async () => {
		mockUserByUsername.mockResolvedValue({
			data: {
				id: "u1",
				name: "Test User",
				username: "testuser",
				description: "A test account",
				public_metrics: { followers_count: 100, following_count: 50 },
				created_at: "2020-01-01T00:00:00Z",
				profile_image_url: "https://pbs.twimg.com/profile/test.jpg",
				verified: false,
			},
		});

		const handler = captureTool(registerGetUser, basicConfig);
		const result = await handler({ username: "testuser" });
		const data = parseContent(result) as Record<string, unknown>;

		expect(mockUserByUsername).toHaveBeenCalledWith("testuser", {
			"user.fields": [
				"description",
				"public_metrics",
				"created_at",
				"profile_image_url",
				"verified",
			],
		});
		expect(data).toEqual({
			id: "u1",
			name: "Test User",
			username: "testuser",
			description: "A test account",
			metrics: { followers_count: 100, following_count: 50 },
			created_at: "2020-01-01T00:00:00Z",
			profile_image_url: "https://pbs.twimg.com/profile/test.jpg",
			verified: false,
			url: "https://x.com/testuser",
		});
		expect(result.isError).toBeUndefined();
	});

	it("is blocked on free tier", async () => {
		const handler = captureTool(registerGetUser, freeConfig);
		const result = await handler({ username: "testuser" });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("get_user");
		expect(getTextContent(result)).toContain("basic");
		expect(mockUserByUsername).not.toHaveBeenCalled();
	});

	it("returns error when user lookup fails", async () => {
		mockUserByUsername.mockRejectedValue(new Error("User not found"));

		const handler = captureTool(registerGetUser, basicConfig);
		const result = await handler({ username: "nonexistent" });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("User not found");
	});
});

// ─── get_mentions (basic tier) ──────────────────────────────────────────────

describe("get_mentions", () => {
	it("returns mentions on basic tier", async () => {
		mockUserMentionTimeline.mockResolvedValue({
			data: {
				data: [
					{
						id: "m1",
						text: "@me hello",
						author_id: "a1",
						created_at: "2025-01-01T00:00:00Z",
						public_metrics: { like_count: 1 },
					},
				],
			},
		});

		const handler = captureTool(registerGetMentions, basicConfig);
		const result = await handler({ max_results: 20 });
		const data = parseContent(result) as {
			result_count: number;
			mentions: Array<Record<string, unknown>>;
		};

		expect(mockMe).toHaveBeenCalled();
		expect(mockUserMentionTimeline).toHaveBeenCalledWith("12345", {
			max_results: 20,
			"tweet.fields": ["created_at", "author_id", "public_metrics"],
		});
		expect(data.result_count).toBe(1);
		expect(data.mentions[0]).toEqual({
			id: "m1",
			text: "@me hello",
			author_id: "a1",
			created_at: "2025-01-01T00:00:00Z",
			metrics: { like_count: 1 },
			url: "https://x.com/i/status/m1",
		});
		expect(result.isError).toBeUndefined();
	});

	it("is blocked on free tier", async () => {
		const handler = captureTool(registerGetMentions, freeConfig);
		const result = await handler({ max_results: 20 });

		expect(result.isError).toBe(true);
		expect(getTextContent(result)).toContain("get_mentions");
		expect(getTextContent(result)).toContain("basic");
		expect(mockUserMentionTimeline).not.toHaveBeenCalled();
	});

	it("handles empty mentions", async () => {
		mockUserMentionTimeline.mockResolvedValue({
			data: { data: undefined },
		});

		const handler = captureTool(registerGetMentions, basicConfig);
		const result = await handler({ max_results: 20 });
		const data = parseContent(result) as { result_count: number; mentions: unknown[] };

		expect(data.result_count).toBe(0);
		expect(data.mentions).toEqual([]);
	});
});

// ─── registerAllTools integration ───────────────────────────────────────────

describe("registerAllTools", () => {
	it("registers all 11 tools", async () => {
		const { registerAllTools } = await import("../src/tools/index.js");

		const registeredTools: string[] = [];
		const fakeServer = {
			tool: (name: string, _desc: string, _schema: unknown, _fn: unknown) => {
				registeredTools.push(name);
			},
		} as unknown as McpServer;

		registerAllTools(fakeServer, freeConfig);

		expect(registeredTools).toHaveLength(11);
		expect(registeredTools).toEqual([
			"post_tweet",
			"post_thread",
			"delete_tweet",
			"like_tweet",
			"unlike_tweet",
			"retweet",
			"unretweet",
			"search_tweets",
			"get_timeline",
			"get_user",
			"get_mentions",
		]);
	});
});
