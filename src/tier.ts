import type { Config } from "./config.js";
import { TierError } from "./errors.js";

export type Tier = "free" | "basic";

const TOOL_TIERS: Record<string, Tier> = {
	post_tweet: "free",
	post_thread: "free",
	delete_tweet: "free",
	like_tweet: "free",
	unlike_tweet: "free",
	retweet: "free",
	unretweet: "free",
	search_tweets: "basic",
	get_timeline: "basic",
	get_user: "basic",
	get_mentions: "basic",
};

export function assertTier(toolName: string, config: Config): void {
	const required = TOOL_TIERS[toolName];
	if (!required) return;
	if (required === "basic" && config.tier === "free") {
		throw new TierError(toolName, "basic");
	}
}
