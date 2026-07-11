"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createAccommodation,
  updateAccommodation,
  deleteAccommodation,
} from "@/actions/accommodations";

export function useCreateAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccommodation,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Szállás rögzítve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useUpdateAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccommodation,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Szállás frissítve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useDeleteAccommodation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAccommodation,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Szállás törölve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
