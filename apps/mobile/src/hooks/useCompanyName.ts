import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompanyName, setCompanyName } from '@/settings/localSettings';

const COMPANY_NAME_QUERY_KEY = ['settings', 'companyName'] as const;

export function useCompanyName() {
  return useQuery({ queryKey: COMPANY_NAME_QUERY_KEY, queryFn: getCompanyName });
}

export function useSetCompanyName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setCompanyName,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: COMPANY_NAME_QUERY_KEY }),
  });
}
