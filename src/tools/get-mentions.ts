import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient, getUserId } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerGetMentions(server: McpServer, config: Config): void {
	server.tool(
		"get_mentions",
		"Get recent mentions of the authenticated user (requires Basic tier)",
		{
			max_results: z
				.number()
				.int()
				.min(1)
				.max(100)
				.default(20)
				.describe("Maximum number of mentions (1-100, default 20)"),
		},
		async ({ max_results }) => {
			try {
				assertTier("get_mentions", config);
				const userId = await getUserId(config);
				const client = getClient(config);
				const result = await client.v2.userMentionTimeline(userId, {
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
									mentions: tweets.map((t) => ({
										id: t.id,
										text: t.text,
										author_id: t.author_id,
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
