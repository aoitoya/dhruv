import { createAuthClient } from "better-auth/react";

export default createAuthClient({
	fetchOptions: {
		headers: { "ngrok-skip-browser-warning": "true" },
	},
});
