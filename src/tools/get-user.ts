import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getClient } from "../client.js";
import type { Config } from "../config.js";
import { formatError } from "../errors.js";
import { assertTier } from "../tier.js";

export function registerGetUser(server: McpServer, config: Config): void {
	server.tool(
		"get_user",
		"Get user profile by username (requires Basic tier)",
		{
			username: z.string().min(1).max(15).describe("X username (without @)"),
		},
		async ({ username }) => {
			try {
				assertTier("get_user", config);
				const client = getClient(config);
				const result = await client.v2.userByUsername(username, {
					"user.fields": [
						"description",
						"public_metrics",
						"created_at",
						"profile_image_url",
						"verified",
					],
				});
				if (!result.data) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({ error: `User "${username}" not found` }, null, 2),
							},
						],
						isError: true,
					};
				}
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									id: result.data.id,
									name: result.data.name,
									username: result.data.username,
									description: result.data.description,
									metrics: result.data.public_metrics,
									created_at: result.data.created_at,
									profile_image_url: result.data.profile_image_url,
									verified: result.data.verified,
									url: `https://x.com/${result.data.username}`,
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
