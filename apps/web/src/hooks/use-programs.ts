"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createProgram, updateProgram, deleteProgram } from "@/actions/programs";

export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProgram,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Program létrehozva");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProgram,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Program frissítve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProgram,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Program törölve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
