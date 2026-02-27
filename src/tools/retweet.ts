import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, getUserId } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerRetweet(server: McpServer, config: Config): void {
	server.tool(
		"retweet",
		"Retweet a tweet",
		{ tweet_id: z.string().min(1).describe("ID of the tweet to retweet") },
		async ({ tweet_id }) => {
			try {
				assertTier("retweet", config);
				const userId = await getUserId(config);
				const client = getClient(config);
				await client.v2.retweet(userId, tweet_id);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ retweeted: true, tweet_id }, null, 2),
						},
					],
				};
			} catch (error) {
				return formatError(error);
			}
		},
	);
}

export function registerUnretweet(server: McpServer, config: Config): void {
	server.tool(
		"unretweet",
		"Remove a retweet",
		{ tweet_id: z.string().min(1).describe("ID of the tweet to unretweet") },
		async ({ tweet_id }) => {
			try {
				assertTier("unretweet", config);
				const userId = await getUserId(config);
				const client = getClient(config);
				await client.v2.unretweet(userId, tweet_id);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ unretweeted: true, tweet_id }, null, 2),
						},
					],
				};
			} catch (error) {
				return formatError(error);
			}
		},
	);
}
