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
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),
	REDIS_URL: z.string().default("redis://localhost:6379"),
	RESEND_API_KEY: z.string().optional(),
	FRONTEND_URL: z.string().default("http://localhost:5173"),
	EMAIL_FROM_ADDRESS: z.string().optional(),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

const env = envSchema.parse(process.env);

export const config = {
	server: {
		port: env.PORT,
		host: env.HOST,
	},
	cors: {
		origins: env.CLIENT_ORIGIN.split(","),
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as string[],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-Requested-With",
		] as string[],
		credentials: true,
		maxAge: 86400,
	},
	auth: {
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		},
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	db: {
		databaseUrl: env.DATABASE_URL,
	},
	redis: {
		url: env.REDIS_URL,
	},
	email: {
		resendApiKey: env.RESEND_API_KEY,
		fromAddress:
			env.NODE_ENV === "production" && !!env.EMAIL_FROM_ADDRESS
				? env.EMAIL_FROM_ADDRESS
				: "Dhruv <no-reply@resend.dev>",
	},
	frontend: {
		url: env.FRONTEND_URL,
	},
	nodeEnv: env.NODE_ENV,
} as const;
