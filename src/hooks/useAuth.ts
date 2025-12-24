import { useLocalAuth } from '@/hooks/useLocalAuth';

// NOTE: This project previously used Supabase Auth.
// We keep the public hook name (`useAuth`) so the rest of the app doesn't
// need widespread rewrites, but it now uses local-only credentials.
//
// ⚠️ Demo-only security: credentials are stored in the browser and are not
// shared between devices.

export const useAuth = () => {
  const local = useLocalAuth();

  // Shape the user to match the parts of Supabase `User` our app uses.
  const user = local.user
    ? ({ id: local.user.id, user_metadata: { display_name: local.user.username } } as any)
    : null;

  // We don't have a session concept in local auth.
  const session = null;

  return { user, session, loading: local.loading, signOut: local.signOut };
};
