import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, getUserId } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerLikeTweet(server: McpServer, config: Config): void {
	server.tool(
		"like_tweet",
		"Like a tweet",
		{ tweet_id: z.string().min(1).describe("ID of the tweet to like") },
		async ({ tweet_id }) => {
			try {
				assertTier("like_tweet", config);
				const userId = await getUserId(config);
				const client = getClient(config);
				await client.v2.like(userId, tweet_id);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ liked: true, tweet_id }, null, 2),
						},
					],
				};
			} catch (error) {
				return formatError(error);
			}
		},
	);
}

export function registerUnlikeTweet(server: McpServer, config: Config): void {
	server.tool(
		"unlike_tweet",
		"Unlike a previously liked tweet",
		{ tweet_id: z.string().min(1).describe("ID of the tweet to unlike") },
		async ({ tweet_id }) => {
			try {
				assertTier("unlike_tweet", config);
				const userId = await getUserId(config);
				const client = getClient(config);
				await client.v2.unlike(userId, tweet_id);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ unliked: true, tweet_id }, null, 2),
						},
					],
				};
			} catch (error) {
				return formatError(error);
			}
		},
	);
}
