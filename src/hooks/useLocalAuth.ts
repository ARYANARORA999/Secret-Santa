import { useEffect, useMemo, useState } from 'react';

type LocalAuthUser = {
  id: string;
  username: string;
};

type StoredUser = {
  id: string;
  username: string;
  passwordHashHex: string;
  createdAt: string;
};

const STORAGE_KEYS = {
  users: 'ss.localAuth.users.v1',
  current: 'ss.localAuth.currentUserId.v1',
} as const;

const safeJsonParse = <T,>(text: string | null, fallback: T): T => {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const sha256Hex = async (text: string) => {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
};

const normalizeUsername = (username: string) =>
  username.trim().toLowerCase().replace(/\s+/g, ' ');

const readUsers = (): StoredUser[] =>
  safeJsonParse<StoredUser[]>(localStorage.getItem(STORAGE_KEYS.users), []);

const writeUsers = (users: StoredUser[]) =>
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));

export const useLocalAuth = () => {
  const [user, setUser] = useState<LocalAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEYS.current);
    if (!id) {
      setUser(null);
      setLoading(false);
      return;
    }
    const users = readUsers();
    const found = users.find((u) => u.id === id);
    setUser(found ? { id: found.id, username: found.username } : null);
    setLoading(false);
  }, []);

  const signUp = useMemo(
    () =>
      async (username: string, password: string) => {
        const u = normalizeUsername(username);
        if (u.length < 2) throw new Error('Username must be at least 2 characters.');
        if (password.length < 4) throw new Error('Password must be at least 4 characters.');

        const users = readUsers();
        if (users.some((x) => x.username.toLowerCase() === u.toLowerCase())) {
          throw new Error('Username already taken.');
        }

        const passwordHashHex = await sha256Hex(password);
        const id = crypto.randomUUID();
        const record: StoredUser = {
          id,
          username: username.trim(),
          passwordHashHex,
          createdAt: new Date().toISOString(),
        };
        users.push(record);
        writeUsers(users);

        localStorage.setItem(STORAGE_KEYS.current, id);
        setUser({ id, username: record.username });
        return { user: { id, username: record.username } };
      },
    []
  );

  const signIn = useMemo(
    () =>
      async (username: string, password: string) => {
        const users = readUsers();
        const u = normalizeUsername(username);
        const found = users.find((x) => normalizeUsername(x.username) === u);
        if (!found) throw new Error('Invalid username or password.');

        const passwordHashHex = await sha256Hex(password);
        if (passwordHashHex !== found.passwordHashHex) {
          throw new Error('Invalid username or password.');
        }

        localStorage.setItem(STORAGE_KEYS.current, found.id);
        setUser({ id: found.id, username: found.username });
        return { user: { id: found.id, username: found.username } };
      },
    []
  );

  const signOut = useMemo(
    () =>
      async () => {
        localStorage.removeItem(STORAGE_KEYS.current);
        setUser(null);
      },
    []
  );

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };
};
