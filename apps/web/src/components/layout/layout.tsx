import type { SessionType } from "@/lib/auth";
import Title from "./Title";

export default function Layout({
	children,
	userData,
}: {
	children: React.ReactNode;
	userData: SessionType;
}) {
	return (
		<div className="grid grid-rows-[60px_1fr] h-dvh w-full">
			<Title userData={userData} />
			{children}
		</div>
	);
}
