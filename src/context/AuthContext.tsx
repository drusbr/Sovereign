"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export const GUEST_FLAG_KEY = "sovereign_guest";
export const GUEST_STATE_KEY = "sovereign_guest_state";

type AuthModalTab = "signin" | "signup";

interface AuthContextValue {
  user: User | null;
  loadingUser: boolean;
  isGuest: boolean;
  authModalOpen: boolean;
  authModalTab: AuthModalTab;
  openAuthModal: (tab?: AuthModalTab) => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: AuthModalTab) => void;
  continueAsGuest: () => void;
  refreshUser: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>("signin");

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: current },
    } = await supabase.auth.getUser();
    setUser(current);
    if (current) {
      setIsGuest(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GUEST_FLAG_KEY);
      }
    }
    return current;
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: current } }) => {
      setUser(current);
      setLoadingUser(false);
      if (current && typeof window !== "undefined") {
        setIsGuest(false);
        window.localStorage.removeItem(GUEST_FLAG_KEY);
      } else if (typeof window !== "undefined") {
        setIsGuest(window.localStorage.getItem(GUEST_FLAG_KEY) === "true");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user && typeof window !== "undefined") {
        setIsGuest(false);
        window.localStorage.removeItem(GUEST_FLAG_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const openAuthModal = useCallback((tab: AuthModalTab = "signin") => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const continueAsGuest = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUEST_FLAG_KEY, "true");
    }
    setIsGuest(true);
    setAuthModalOpen(false);
  }, []);

  const signOutUser = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loadingUser,
        isGuest,
        authModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        setAuthModalTab,
        continueAsGuest,
        refreshUser,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
