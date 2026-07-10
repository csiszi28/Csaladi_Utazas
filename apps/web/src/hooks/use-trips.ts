"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTripsList,
  getTrip,
  getCalendarData,
  createTrip,
  updateTrip,
  deleteTrip,
} from "@/actions/trips";

export function useTripsList() {
  return useQuery({
    queryKey: ["trips", "list"],
    queryFn: () => getTripsList(),
    staleTime: 60_000,
  });
}

export function useTrips() {
  return useTripsList();
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: ["trips", id],
    queryFn: () => getTrip(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCalendarData() {
  return useQuery({
    queryKey: ["calendar"],
    queryFn: () => getCalendarData(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTrip,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Utazás létrehozva");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTrip,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Utazás frissítve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTrip,
    onSuccess: (result) => {
      if (!result.success) toast.error(result.error);
      else toast.success("Utazás törölve");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });
}
