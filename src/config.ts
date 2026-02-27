import { z } from "zod";

const configSchema = z.object({
	apiKey: z.string().min(1, "X_API_KEY is required"),
	apiSecret: z.string().min(1, "X_API_SECRET is required"),
	accessToken: z.string().min(1, "X_ACCESS_TOKEN is required"),
	accessTokenSecret: z.string().min(1, "X_ACCESS_TOKEN_SECRET is required"),
	tier: z.enum(["free", "basic"]).default("free"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
	return configSchema.parse({
		apiKey: process.env.X_API_KEY,
		apiSecret: process.env.X_API_SECRET,
		accessToken: process.env.X_ACCESS_TOKEN,
		accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET,
		tier: process.env.X_API_TIER ?? "free",
	});
}
