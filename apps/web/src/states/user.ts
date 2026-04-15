import { atom } from "jotai";

export interface User {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	email: string;
	emailVerified: boolean;
	name: string;
	image?: string | null | undefined;
}

export const userAtom = atom<User | null>(null);
