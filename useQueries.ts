import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { FileReference } from '../backend';

export function useFileReferences() {
  const { actor, isFetching } = useActor();

  return useQuery<FileReference[]>({
    queryKey: ['fileReferences'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listFileReferences();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useFileReference(path: string) {
  const { actor, isFetching } = useActor();

  return useQuery<FileReference>({
    queryKey: ['fileReference', path],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFileReference(path);
    },
    enabled: !!actor && !isFetching && !!path,
  });
}

export function useRegisterFileReference() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ path, hash }: { path: string; hash: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.registerFileReference(path, hash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileReferences'] });
    },
  });
}

export function useDropFileReference() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.dropFileReference(path);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileReferences'] });
    },
  });
}
