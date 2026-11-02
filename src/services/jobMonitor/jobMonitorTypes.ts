export interface ScheduledJob {
  runnable?: string;
  type: 'cron' | 'fixedRate' | 'fixedDelay' | string;
  expression?: string;
  intervalMs?: number;
  initialDelayMs?: number;
  /** Son çalışma (base-service kaydı; servis yeniden başlayınca sıfırlanır). */
  lastStatus?: 'NEVER' | 'RUNNING' | 'SUCCESS' | 'ERROR' | string;
  lastFinishedAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastDurationMs?: number;
  lastError?: string;
  runs?: number;
  failures?: number;
}

export interface ServiceJobs {
  serviceName: string;
  status: 'up' | 'down' | string;
  error?: string;
  jobCount: number;
  failingJobs?: number;
  cron: ScheduledJob[];
  fixedRate: ScheduledJob[];
  fixedDelay: ScheduledJob[];
}

export interface JobMonitorResponse {
  generatedAt: string;
  totalJobs: number;
  activeServices: number;
  failingJobs?: number;
  services: ServiceJobs[];
}
