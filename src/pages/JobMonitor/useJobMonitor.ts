import { useQuery } from '@tanstack/react-query';
import { jobMonitorService } from '../../services/jobMonitor/jobMonitorService';

export function useJobMonitor() {
  return useQuery({
    queryKey: ['job-monitor'],
    queryFn: () => jobMonitorService.getJobs(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
