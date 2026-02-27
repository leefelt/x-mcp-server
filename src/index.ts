#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
	try {
		const config = loadConfig();
		logger.info("Starting X MCP server", { tier: config.tier });

		const server = createServer(config);
		const transport = new StdioServerTransport();
		await server.connect(transport);

		logger.info("X MCP server running on stdio");
	} catch (error) {
		logger.error("Failed to start server", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	}
}

main();
