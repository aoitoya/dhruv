import {
	createFileRoute,
	Outlet,
	redirect,
	useLoaderData,
} from "@tanstack/react-router";
import Layout from "@/components/layout/layout";
import authClient, { type SessionType } from "@/lib/auth";

export const Route = createFileRoute("/app")({
	beforeLoad: async () => {
		const { data: session, error } = await authClient.getSession();

		if (error || !session) {
			throw redirect({ to: "/" });
		}

		return { session };
	},
	component: AppLayoutComponent,
});

function AppLayoutComponent() {
	const { session } = useLoaderData({ from: "/app" }) as {
		session: SessionType;
	};
	return (
		<Layout userData={session}>
			<Outlet />
		</Layout>
	);
}
