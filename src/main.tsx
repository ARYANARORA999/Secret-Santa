import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// Initialize app after handling potential Supabase auth redirect URL
async function init() {
		try {
			// If the user clicked a magic link, Supabase often returns tokens in the URL
			// fragment (hash) or query. Parse them and set the session in the client so
			// the app recognizes the logged-in user.
			const parseParams = (str: string) =>
				str
					.replace(/^#|^\?/,'')
					.split('&')
					.map((p) => p.split('='))
					.reduce<Record<string,string>>((acc, [k, v]) => {
						if (k) acc[decodeURIComponent(k)] = decodeURIComponent(v || '');
						return acc;
					}, {});

			const params = {
				...parseParams(window.location.search),
				...parseParams(window.location.hash),
			};

			const access_token = params['access_token'] || params['accessToken'] || params['access-token'];
			const refresh_token = params['refresh_token'] || params['refreshToken'] || params['refresh-token'];

			if (access_token && refresh_token) {
				// Set session so Supabase client stores tokens and triggers onAuthStateChange
				await supabase.auth.setSession({ access_token, refresh_token });

				// Clean the URL so tokens aren't visible in the address bar
				try {
					const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
					window.history.replaceState({}, document.title, cleanUrl);
				} catch {}
			}
		} catch (err) {
			// Not fatal — continue rendering the app. Log for debugging.
			// eslint-disable-next-line no-console
			console.debug('Failed to parse or set Supabase session from URL', err);
		}

	createRoot(document.getElementById("root")!).render(<App />);
}

init();
