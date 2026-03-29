import { createAuthClient } from "better-auth/react";

export default createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
});
