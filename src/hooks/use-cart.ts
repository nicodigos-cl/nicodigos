"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useSession } from "@/lib/auth-client";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/lib/actions/orders";
import type { CartDto } from "@/types/orders";

export type CartResponse = {
  cart: CartDto | null;
  authenticated: boolean;
};

export const cartKeys = {
  all: ["cart"] as const,
  current: (userId: string | null) =>
    [...cartKeys.all, "current", userId ?? "anon"] as const,
};

async function fetchCart(): Promise<CartResponse> {
  const response = await fetch("/api/cart");

  if (!response.ok) {
    throw new Error("No se pudo cargar el carrito");
  }

  return (await response.json()) as CartResponse;
}

type UseCartOptions = Omit<
  UseQueryOptions<CartResponse, Error, CartResponse>,
  "queryKey" | "queryFn"
>;

export function useCart(options?: UseCartOptions) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  return useQuery({
    staleTime: 1000 * 30,
    ...options,
    queryKey: cartKeys.current(userId),
    queryFn: fetchCart,
  });
}

export function useCartItemsCount() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const query = useQuery({
    queryKey: cartKeys.current(userId),
    queryFn: fetchCart,
    staleTime: 1000 * 30,
    select: (data) => data.cart?.itemsCount ?? 0,
  });

  return {
    ...query,
    count: query.data ?? 0,
  };
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { cartItemId: string; quantity: number }) => {
      const result = await updateCartItemAction(input);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { cartItemId: string }) => {
      const result = await removeCartItemAction(input);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.data;
    },
    onSuccess: async () => {
      toast.success("Producto eliminado");
      await queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
