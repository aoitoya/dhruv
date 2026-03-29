import z from "zod";

const envSchema = z.object({
	PORT: z
		.string()
		.regex(/^\d+$/, "Must be numeric string")
		.transform(Number)
		.default(3000),
	HOST: z.string().default("0.0.0.0"),
	CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
	DATABASE_URL: z.string(),
	GITHUB_CLIENT_ID: z.string(),
	GITHUB_CLIENT_SECRET: z.string(),
});

const env = envSchema.parse(process.env);

export const config = {
	server: {
		port: env.PORT,
		host: env.HOST,
	},
	cors: {
		origins: env.CLIENT_ORIGIN.split(","),
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
		credentials: true,
		maxAge: 86400,
	},
	auth: {
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		},
	},
	db: {
		databaseUrl: env.DATABASE_URL,
	},
} as const;
