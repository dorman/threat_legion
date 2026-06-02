import { useCallback, useEffect, useState } from "react";
import {
  acceptDisclaimer,
  deleteScan,
  downgradeTier,
  getMe,
  getScan,
  getSubscription,
  listScans,
  saveAiSettings,
  upgradeTier,
} from "./generated/api";
import type {
  SaveAiSettingsBody,
  Scan,
  ScanWithFindings,
  Subscription,
  User,
} from "./generated/api.schemas";

type QueryOptions = {
  enabled?: boolean;
};

type QueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<T | undefined>;
};

function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options?: QueryOptions
): QueryResult<T> {
  const enabled = options?.enabled !== false;
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(enabled);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<unknown>();

  const refetch = useCallback(async () => {
    if (!enabled) return undefined;
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await fetcher();
      setData(result);
      return result;
    } catch (err) {
      setIsError(true);
      setError(err);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [enabled, fetcher]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void refetch();
  }, [enabled, refetch, ...deps]);

  return { data, isLoading, isError, error, refetch };
}

type MutationOptions<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown, variables: TVariables) => void;
};

type MutationResult<TData, TVariables> = {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
};

function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: MutationOptions<TData, TVariables>
): MutationResult<TData, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const onSuccess = options?.onSuccess;
  const onError = options?.onError;

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      try {
        const result = await mutationFn(variables);
        onSuccess?.(result, variables);
        return result;
      } catch (err) {
        onError?.(err, variables);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      void mutateAsync(variables);
    },
    [mutateAsync]
  );

  return { mutate, mutateAsync, isPending };
}

export function useGetMe(options?: QueryOptions): QueryResult<User> {
  const fetcher = useCallback(() => getMe(), []);
  return useQuery(fetcher, [], options);
}

export function useListScans(options?: QueryOptions): QueryResult<Scan[]> {
  const fetcher = useCallback(() => listScans(), []);
  return useQuery(fetcher, [], options);
}

export function useGetScan(
  id: number,
  options?: QueryOptions
): QueryResult<ScanWithFindings> {
  const fetcher = useCallback(() => getScan(id), [id]);
  return useQuery(fetcher, [id], options);
}

export function useGetSubscription(options?: QueryOptions): QueryResult<Subscription> {
  const fetcher = useCallback(() => getSubscription(), []);
  return useQuery(fetcher, [], options);
}

export function useSaveAiSettings(
  options?: MutationOptions<User, { data: SaveAiSettingsBody }>
) {
  const mutationFn = useCallback(
    ({ data }: { data: SaveAiSettingsBody }) => saveAiSettings(data),
    []
  );
  return useMutation(mutationFn, options);
}

export function useAcceptDisclaimer(options?: MutationOptions<User, void>) {
  const mutationFn = useCallback(() => acceptDisclaimer(), []);
  const { mutate: run, ...rest } = useMutation(mutationFn, options);
  return {
    ...rest,
    mutate: () => run(undefined as void),
  };
}

export function useDeleteScan(
  options?: MutationOptions<unknown, { id: number }>
) {
  const mutationFn = useCallback(({ id }: { id: number }) => deleteScan(id), []);
  return useMutation(mutationFn, options);
}

export function useUpgradeTier(options?: MutationOptions<Subscription, void>) {
  const mutationFn = useCallback(() => upgradeTier(), []);
  const { mutate: run, ...rest } = useMutation(mutationFn, options);
  return {
    ...rest,
    mutate: () => run(undefined as void),
  };
}

export function useDowngradeTier(options?: MutationOptions<Subscription, void>) {
  const mutationFn = useCallback(() => downgradeTier(), []);
  const { mutate: run, ...rest } = useMutation(mutationFn, options);
  return {
    ...rest,
    mutate: () => run(undefined as void),
  };
}
