import { Resend } from "resend";
import { config } from "../config/index.js";

export const sendInviteEmail = async (
	email: string,
	token: string,
	workspaceName: string,
	inviterName: string,
	role: string,
) => {
	if (config.nodeEnv === "test") return;

	if (!config.email.resendApiKey) {
		console.warn("Resend API Key is empty");
	}

	const resend = new Resend(config.email.resendApiKey);

	const titleCasedRole = role
		.split("")
		.map((e, i) => (i === 0 ? e.toUpperCase() : e.toLowerCase()))
		.join("");

	const { error } = await resend.emails.send({
		from: config.email.fromAddress,
		to: [email],
		subject: `${inviterName} invited you to ${workspaceName || "Dhruv"}`,
		html: `
    <h2>You are invited!</h2>
    <p>Hi,</p>
    <p><strong>${inviterName}</strong> has invited you to join
    <strong>${workspaceName}</strong> as a <strong>${titleCasedRole}</strong>.</p>
    <p><a href="${config.frontend.url}/invite/${token}">Accept invitation</a></p>
    <p>This link expires in 48 hours.</p>
    `,
	});

	if (error) {
		return console.error({ error });
	}
};
