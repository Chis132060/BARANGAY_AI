"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type AuthChangeEvent, type Session, type User } from "@supabase/supabase-js";
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

  useEffect(() => {
    async function getSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          const userRole = session.user.user_metadata?.role || "Staff";
          setRole(userRole);

          // Fetch role_id from the users table
          const { data: userProfile } = await supabase
            .from("users")
            .select("role_id, role:roles(name)")
            .eq("id", session.user.id)
            .single();

          if (userProfile) {
            const rid = userProfile.role_id;
            const roleName = (userProfile as any).role?.name || userRole;
            setRoleId(rid);
            setRole(roleName);
            if (rid) await loadPermissions(rid);
          }
        }
      } catch (err) {
        console.error("Error retrieving session:", err);
      } finally {
        setLoading(false);
      }
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          setUser(session.user);
          const userRole = session.user.user_metadata?.role || "Staff";
          setRole(userRole);

          const { data: userProfile } = await supabase
            .from("users")
            .select("role_id, role:roles(name)")
            .eq("id", session.user.id)
            .single();

          if (userProfile) {
            const rid = userProfile.role_id;
            const roleName = (userProfile as any).role?.name || userRole;
            setRoleId(rid);
            setRole(roleName);
            if (rid) await loadPermissions(rid);
          }
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
      subscription.unsubscribe();
    };
  }, []);

  function hasPermission(module: string, action: keyof PermissionSet): boolean {
    if (!role) return false;
    // Super Admin has unrestricted access to all modules and actions
    if (role === "Super Admin") return true;
    // Super Admin wildcard from permissions
    if (permissions["*"]) return permissions["*"][action];
    // Fallback if permissions table is empty or loading
    if (Object.keys(permissions).length === 0) return true;
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
