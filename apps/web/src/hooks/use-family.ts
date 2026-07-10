"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from "@/actions/family";

export function useFamilyMembers() {
  return useQuery({
    queryKey: ["family-members"],
    queryFn: () => getFamilyMembers(),
    staleTime: 60_000,
  });
}

export function useCreateFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createFamilyMember,
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["family-members"] });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof getFamilyMembers>>>(["family-members"]);
      const optimistic = {
        id: crypto.randomUUID(),
        name: newData.name,
        userId: null,
      };
      queryClient.setQueryData(["family-members"], [...(previous ?? []), optimistic]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["family-members"], ctx?.previous);
      toast.error("Nem sikerült létrehozni a családtagot");
    },
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Családtag létrehozva");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["family-members"] }),
  });
}

export function useUpdateFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFamilyMember,
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ["family-members"] });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof getFamilyMembers>>>(["family-members"]);
      queryClient.setQueryData(
        ["family-members"],
        (previous ?? []).map((m) => (m.id === updated.id ? { ...m, name: updated.name } : m))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["family-members"], ctx?.previous);
      toast.error("Nem sikerült frissíteni");
    },
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Családtag frissítve");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["family-members"] }),
  });
}

export function useDeleteFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteFamilyMember,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["family-members"] });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof getFamilyMembers>>>(["family-members"]);
      queryClient.setQueryData(
        ["family-members"],
        (previous ?? []).filter((m) => m.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(["family-members"], ctx?.previous);
      toast.error("Nem sikerült törölni");
    },
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Családtag törölve");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["family-members"] }),
  });
}
