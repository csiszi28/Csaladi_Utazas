"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createTripIdea,
  updateTripIdea,
  deleteTripIdea,
  toggleIdeaInterest,
} from "@/actions/ideas";

export function useCreateTripIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTripIdea,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Ötlet létrehozva");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

export function useUpdateTripIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTripIdea,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Ötlet frissítve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

export function useDeleteTripIdea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTripIdea,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Ötlet törölve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}

export function useToggleIdeaInterest() {
  return useMutation({
    mutationFn: toggleIdeaInterest,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
    },
  });
}
