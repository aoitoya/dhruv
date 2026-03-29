import { buildApp } from "@/app.js";
import { config } from "@/config/index.js";

/**
 * Starts the server by building the application and listening on the host and port from `config`.
 *
 * If the server fails to start, logs the error via the application's logger and exits the process with code `1`.
 */
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
