import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSiteContent, updateSiteContent, uploadContentImage } from '../services/content';
import { SiteContent } from '../types';

export function useSiteContent() {
  return useQuery({
    queryKey: ['site-content'],
    queryFn: getSiteContent,
  });
}

export function useUpdateSiteContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: SiteContent) => updateSiteContent(content),
    onSuccess: (data) => {
      queryClient.setQueryData(['site-content'], data);
    },
  });
}

export function useUploadContentImage() {
  return useMutation({
    mutationFn: (file: File) => uploadContentImage(file),
  });
}
