import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerDeleteTweet(server: McpServer, config: Config): void {
	server.tool(
		"delete_tweet",
		"Delete a tweet by ID",
		{ tweet_id: z.string().min(1).describe("ID of the tweet to delete") },
		async ({ tweet_id }) => {
			try {
				assertTier("delete_tweet", config);
				const client = getClient(config);
				await client.v2.deleteTweet(tweet_id);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ deleted: true, tweet_id }, null, 2),
						},
					],
				};
			} catch (error) {
				return formatError(error);
			}
		},
	);
}
