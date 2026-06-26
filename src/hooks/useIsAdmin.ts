import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Devuelve si el usuario autenticado es administrador global de TechSecure AI.
 * Se basa en la función SQL `is_global_admin(uid)`, llamada vía RPC.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        if (active) setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase.rpc("is_global_admin", { _user_id: uid });
      if (active) setIsAdmin(!error && data === true);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}