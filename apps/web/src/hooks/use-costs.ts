"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCost, updateCost, deleteCost, getReportsData } from "@/actions/costs";

export function useReportsData(tripId?: string) {
  return useQuery({
    queryKey: ["reports", tripId],
    queryFn: () => getReportsData(tripId),
    staleTime: 60_000,
  });
}

export function useCreateCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCost,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Költség rögzítve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCost,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Költség frissítve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useDeleteCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCost,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Költség törölve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
