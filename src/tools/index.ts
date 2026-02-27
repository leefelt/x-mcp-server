import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { registerDeleteTweet } from "./delete-tweet.js";
import { registerGetMentions } from "./get-mentions.js";
import { registerGetTimeline } from "./get-timeline.js";
import { registerGetUser } from "./get-user.js";
import { registerLikeTweet, registerUnlikeTweet } from "./like-tweet.js";
import { registerPostThread } from "./post-thread.js";
import { registerPostTweet } from "./post-tweet.js";
import { registerRetweet, registerUnretweet } from "./retweet.js";
import { registerSearchTweets } from "./search-tweets.js";

export function registerAllTools(server: McpServer, config: Config): void {
	// Free tier tools (write operations)
	registerPostTweet(server, config);
	registerPostThread(server, config);
	registerDeleteTweet(server, config);
	registerLikeTweet(server, config);
	registerUnlikeTweet(server, config);
	registerRetweet(server, config);
	registerUnretweet(server, config);

	// Basic tier tools (read operations)
	registerSearchTweets(server, config);
	registerGetTimeline(server, config);
	registerGetUser(server, config);
	registerGetMentions(server, config);
}
