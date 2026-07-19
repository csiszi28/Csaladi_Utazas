"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createTransport, updateTransport, deleteTransport } from "@/actions/transports";

export function useCreateTransport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTransport,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Közlekedés létrehozva");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useUpdateTransport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTransport,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Közlekedés frissítve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useDeleteTransport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTransport,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Közlekedés törölve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
