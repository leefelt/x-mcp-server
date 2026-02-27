import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerSearchTweets(server: McpServer, config: Config): void {
	server.tool(
		"search_tweets",
		"Search recent tweets (requires Basic tier)",
		{
			query: z.string().min(1).max(512).describe("Search query (X API v2 query syntax)"),
			max_results: z
				.number()
				.int()
				.min(10)
				.max(100)
				.default(10)
				.describe("Maximum number of results (10-100, default 10)"),
		},
		async ({ query, max_results }) => {
			try {
				assertTier("search_tweets", config);
				const client = getClient(config);
				const result = await client.v2.search(query, {
					max_results,
					"tweet.fields": ["created_at", "author_id", "public_metrics"],
				});
				const tweets = result.data.data ?? [];
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									result_count: tweets.length,
									tweets: tweets.map((t) => ({
										id: t.id,
										text: t.text,
										created_at: t.created_at,
										author_id: t.author_id,
										metrics: t.public_metrics,
										url: `https://x.com/i/status/${t.id}`,
									})),
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
