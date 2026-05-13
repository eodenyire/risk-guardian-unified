import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export const useOrganization = () => {
  const { data: profile } = useProfile();
  return useQuery({
    queryKey: ["organization", profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile!.organization_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateOrganization = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (org: TablesInsert<"organizations">) => {
      const { data: created, error } = await supabase
        .from("organizations")
        .insert(org)
        .select()
        .single();
      if (error) throw error;

      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: user!.id, organization_id: created.id, role: "owner" });
      if (roleErr) throw roleErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ organization_id: created.id })
        .eq("user_id", user!.id);
      if (profErr) throw profErr;

      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["organization"] });
    },
  });
};

export const useUpdateOrganization = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"organizations"> & { id: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization"] }),
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"profiles">) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
};
