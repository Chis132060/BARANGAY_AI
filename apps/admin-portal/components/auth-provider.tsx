"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Session, type User } from "@supabase/supabase-js";
import { fetchUserPermissions, type PermissionSet, clearPermissionCache } from "@/lib/permissions";

interface AuthContextType {
  user: User | null;
  role: string | null;
  roleId: string | null;
  permissions: Record<string, PermissionSet>;
  loading: boolean;
  hasPermission: (module: string, action: keyof PermissionSet) => boolean;
  refreshPermissions: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  roleId: null,
  permissions: {},
  loading: true,
  hasPermission: () => false,
  refreshPermissions: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, PermissionSet>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadPermissions = useCallback(async (rid: string) => {
    try {
      const perms = await fetchUserPermissions(rid);
      setPermissions(perms);
    } catch (err) {
      console.error("Error loading permissions:", err);
      setPermissions({});
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (roleId) {
      clearPermissionCache();
      await loadPermissions(roleId);
    }
  }, [roleId, loadPermissions]);

  const loadUserProfile = useCallback(async (session: Session) => {
    setUser(session.user);
    setRole(null);
    setRoleId(null);
    setPermissions({});

    try {
      const { data: userProfile, error } = await supabase
        .from("users")
        .select("role_id, role:roles(name)")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      if (userProfile) {
        const rid = userProfile.role_id;
        const roleName = (userProfile as any).role?.name || null;
        setRoleId(rid);
        setRole(roleName);
        if (rid) await loadPermissions(rid);
      }
    } catch (err) {
      console.error("Error loading admin profile:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, loadPermissions]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) void loadUserProfile(session);
      else setLoading(false);
    }).catch((err) => {
      console.error("Error retrieving session:", err);
      if (active) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session: Session | null) => {
        if (session) {
          setLoading(true);
          // Do not await Supabase queries inside this callback; Auth keeps an
          // internal lock while notifying listeners.
          window.setTimeout(() => {
            if (active) void loadUserProfile(session);
          }, 0);
        } else {
          setUser(null);
          setRole(null);
          setRoleId(null);
          setPermissions({});
          clearPermissionCache();
        }
        setLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadUserProfile]);

  function hasPermission(module: string, action: keyof PermissionSet): boolean {
    if (!role) return false;
    // Super Admin has unrestricted access to all modules and actions
    if (role === "Super Admin") return true;
    // Super Admin wildcard from permissions
    if (permissions["*"]) return permissions["*"][action];
    return permissions[module]?.[action] ?? false;
  }

  async function signOut() {
    clearPermissionCache();
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, role, roleId, permissions, loading, hasPermission, refreshPermissions, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
