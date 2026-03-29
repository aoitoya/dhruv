import { buildApp } from "@/app.js";
import { config } from "@/config/index.js";

async function start() {
	const app = await buildApp();

	try {
		await app.listen({
			port: config.server.port,
			host: config.server.host,
		});
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

start();
