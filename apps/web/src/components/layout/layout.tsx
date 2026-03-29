import Title from "./Title";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="grid  bg-black h-dvh w-full">
			<Title />
			{children}
		</div>
	);
}
