import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerPostTweet(server: McpServer, config: Config): void {
	server.tool(
		"post_tweet",
		"Post a tweet to X (Twitter)",
		{ text: z.string().min(1).max(280).describe("Tweet text (max 280 characters)") },
		async ({ text }) => {
			try {
				assertTier("post_tweet", config);
				const client = getClient(config);
				const result = await client.v2.tweet(text);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									id: result.data.id,
									text: result.data.text,
									url: `https://x.com/i/status/${result.data.id}`,
								},
								null,
								2,
							),
						},
					],
				};
			} catch (error) {
				return formatError(error);
			}
		},
	);
}
