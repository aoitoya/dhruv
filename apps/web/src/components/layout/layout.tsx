import Title from "./Title";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="grid grid-rows-[60px_1fr]  bg-black h-dvh w-full">
			<Title />
			{children}
		</div>
	);
}
