import { TwitterApi } from "twitter-api-v2";
import type { Config } from "./config.js";
import { logger } from "./logger.js";

let clientInstance: TwitterApi | null = null;
let userIdPromise: Promise<string> | null = null;

export function getClient(config: Config): TwitterApi {
	if (!clientInstance) {
		clientInstance = new TwitterApi({
			appKey: config.apiKey,
			appSecret: config.apiSecret,
			accessToken: config.accessToken,
			accessSecret: config.accessTokenSecret,
		});
		logger.info("Twitter API client initialized");
	}
	return clientInstance;
}

export async function getUserId(config: Config): Promise<string> {
	if (!userIdPromise) {
		userIdPromise = (async () => {
			const client = getClient(config);
			const me = await client.v2.me();
			logger.info("Authenticated user ID cached", { userId: me.data.id });
			return me.data.id;
		})();
	}
	return userIdPromise;
}

/** Reset client state (for testing) */
export function resetClient(): void {
	clientInstance = null;
	userIdPromise = null;
}
