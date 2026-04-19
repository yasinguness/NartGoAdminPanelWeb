/**
 * Section-level error boundary — bir bölüm çökerse tüm console çökmesin.
 * React 18 class component ile yazıldı (error boundary hooks henüz yok).
 */
import { Component, ReactNode } from 'react';
import { Paper, Typography, Button, Stack } from '@mui/material';
import { ErrorOutline as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Prod'da buraya Sentry/Bugsnag gönder
    console.error(`[SectionErrorBoundary] ${this.props.sectionName || 'section'} hata:`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center">
            <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />
            <Typography variant="h6" fontWeight={700}>
              Bu bölüm yüklenemedi
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
              {this.props.sectionName || 'Bölüm'} yüklenirken bir hata oluştu.
              Sorun devam ederse sayfayı yenileyin.
            </Typography>
            {this.state.error?.message && (
              <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                {this.state.error.message}
              </Typography>
            )}
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleRetry}>
              Tekrar Dene
            </Button>
          </Stack>
        </Paper>
      );
    }

    return this.props.children;
  }
}
