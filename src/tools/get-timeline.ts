import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, getUserId } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerGetTimeline(server: McpServer, config: Config): void {
	server.tool(
		"get_timeline",
		"Get the authenticated user's home timeline (requires Basic tier)",
		{
			max_results: z
				.number()
				.int()
				.min(1)
				.max(100)
				.default(20)
				.describe("Maximum number of tweets (1-100, default 20)"),
		},
		async ({ max_results }) => {
			try {
				assertTier("get_timeline", config);
				const userId = await getUserId(config);
				const client = getClient(config);
				const result = await client.v2.userTimeline(userId, {
					max_results,
					"tweet.fields": ["created_at", "public_metrics"],
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
