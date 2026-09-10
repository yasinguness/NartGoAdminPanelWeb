export interface ScheduledJob {
  runnable?: string;
  type: 'cron' | 'fixedRate' | 'fixedDelay' | string;
  expression?: string;
  intervalMs?: number;
  initialDelayMs?: number;
}

export interface ServiceJobs {
  serviceName: string;
  status: 'up' | 'down' | string;
  error?: string;
  jobCount: number;
  cron: ScheduledJob[];
  fixedRate: ScheduledJob[];
  fixedDelay: ScheduledJob[];
}

export interface JobMonitorResponse {
  generatedAt: string;
  totalJobs: number;
  activeServices: number;
  services: ServiceJobs[];
}
