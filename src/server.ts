import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import { registerAllTools } from "./tools/index.js";

export function createServer(config: Config): McpServer {
	const server = new McpServer({
		name: "x-mcp-server",
		version: "0.1.0",
	});

	registerAllTools(server, config);

	return server;
}
