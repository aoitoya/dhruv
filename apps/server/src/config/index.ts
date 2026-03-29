export const config = {
	server: {
		port: parseInt(process.env.PORT ?? "3000", 10),
		host: process.env.HOST ?? "0.0.0.0",
	},
	cors: {
		origins: (process.env.CLIENT_ORIGIN as string).split(","),
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
		credentials: true,
		maxAge: 86400,
	},
	auth: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID as string,
			clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
		},
	},
	db: {
		databaseUrl: process.env.DATABASE_URL as string,
	},
} as const;
