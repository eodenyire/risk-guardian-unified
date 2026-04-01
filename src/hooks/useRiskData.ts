import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRiskTypes = () => {
  return useQuery({
    queryKey: ["risk-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_types")
        .select("*")
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useDataSources = () => {
  return useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
};

export const useRiskRegister = () => {
  return useQuery({
    queryKey: ["risk-register"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risk_register")
        .select("*, risk_types(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useKRIs = () => {
  return useQuery({
    queryKey: ["kris"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kri")
        .select("*, risk_types(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useControls = () => {
  return useQuery({
    queryKey: ["controls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("controls")
        .select("*, risk_types(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useRCSA = () => {
  return useQuery({
    queryKey: ["rcsa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rcsa")
        .select("*, risk_types(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useSyncLog = () => {
  return useQuery({
    queryKey: ["sync-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_log")
        .select("*, data_sources(name, source_type)")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
};
