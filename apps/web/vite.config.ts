import url from "node:url";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
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
		host: true,
	},
});
