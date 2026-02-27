import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerPostThread(server: McpServer, config: Config): void {
	server.tool(
		"post_thread",
		"Post a thread (multiple tweets) to X (Twitter)",
		{
			tweets: z
				.array(z.string().min(1).max(280))
				.min(2)
				.max(25)
				.describe("Array of tweet texts forming a thread (2-25 tweets)"),
		},
		async ({ tweets }) => {
			try {
				assertTier("post_thread", config);
				const client = getClient(config);
				const posted: Array<{ id: string; text: string }> = [];
				let lastId: string | undefined;

				for (const text of tweets) {
					const result = await client.v2.tweet({
						text,
						...(lastId && { reply: { in_reply_to_tweet_id: lastId } }),
					});
					posted.push({ id: result.data.id, text: result.data.text });
					lastId = result.data.id;
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									thread_length: posted.length,
									tweets: posted.map((t) => ({
										...t,
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
