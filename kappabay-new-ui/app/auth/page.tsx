"use client";

import { useAuthCallback, useZkLogin, useZkLoginSession } from "@mysten/enoki/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

const AuthPage = () => {
	const { handled } = useAuthCallback();
	const { address } = useZkLogin();
	const zksesstion = useZkLoginSession();

	useEffect(() => {
		if (handled) {
			// Redirect to the home page after successful authentication
			redirect("/");
		}
	}, [handled, address, zksesstion?.jwt]);

	return (
		<div className="flex items-center justify-center h-screen">
			<p>Loading...</p>
		</div>
	);
};

export default AuthPage;
