import url from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, import.meta.dirname, "");

	return {
		plugins: [
			tailwindcss(),
			tanstackRouter({ target: "react" }),
			react(),
			babel({ presets: [reactCompilerPreset()] }),
		],
		resolve: {
			alias: {
				"@": url.fileURLToPath(new URL("./src", import.meta.url)),
			},
		},
		server: {
			proxy: {
				"/api": {
					target: env.VITE_SERVER_URL,
					changeOrigin: true,
					secure: true,
				},
				"/socket.io": {
					target: env.VITE_SERVER_URL,
					changeOrigin: true,
					secure: true,
					ws: true,
				},
			},
		},
	};
});
