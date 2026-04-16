import {
	createRootRoute,
	Navigate,
	Outlet,
	useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import authClient from "@/lib/auth";
import { userAtom } from "@/states/user";

const RootLayout = () => {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [, setUser] = useAtom(userAtom);

	const isAuthPage = router.state.location.pathname === "/";
	const isAuthenticated = !!session;

	useEffect(() => {
		if (session) {
			setUser(session.user);
		} else {
			setUser(null);
		}
	}, [session, setUser]);

	if (isPending) {
		return null;
	}

	if (!isAuthenticated && !isAuthPage) {
		return <Navigate to="/" />;
	}

	if (isAuthenticated && isAuthPage) {
		return <Navigate to="/app" />;
	}

	return (
		<ThemeProvider>
			<div>
				<Outlet />
				<TanStackRouterDevtools />
			</div>
		</ThemeProvider>
	);
};

export const Route = createRootRoute({
	component: RootLayout,
});
