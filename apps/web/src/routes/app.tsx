import { createFileRoute, Outlet } from "@tanstack/react-router";
import Layout from "@/components/layout/layout";

export const Route = createFileRoute("/app")({
	component: AppLayoutComponent,
});

function AppLayoutComponent() {
	return (
		<Layout>
			<Outlet />
		</Layout>
	);
}
