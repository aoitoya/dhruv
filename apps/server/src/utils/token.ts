import { createHash, randomBytes } from "node:crypto";

export const hashToken = (token: string) => {
	return createHash("sha256").update(token).digest("hex");
};

export const generateRandomToken = () => {
	const token = randomBytes(48).toString("hex");
	const hash = hashToken(token);

	return { token, hash };
};
