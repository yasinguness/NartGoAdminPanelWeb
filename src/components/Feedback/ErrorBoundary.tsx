import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({
            error,
            errorInfo,
        });

    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Container maxWidth="md" sx={{ mt: 4 }}>
                    <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
                        <ErrorOutlineIcon
                            sx={{ fontSize: 80, color: 'error.main', mb: 2 }}
                        />
                        <Typography variant="h4" gutterBottom color="error">
                            Something went wrong
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </Typography>
                        <Box sx={{ mb: 3 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={this.handleReset}
                                size="large"
                            >
                                Reload Page
                            </Button>
                        </Box>
                        {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                            <Box sx={{ mt: 3, textAlign: 'left' }}>
                                <Typography variant="h6" gutterBottom>
                                    Error Details:
                                </Typography>
                                <Paper
                                    elevation={1}
                                    sx={{ p: 2, bgcolor: 'grey.100', overflow: 'auto' }}
                                >
                                    <pre style={{ fontSize: '12px' }}>
                                        {this.state.error?.toString()}
                                        {'\n'}
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </Paper>
                            </Box>
                        )}
                    </Paper>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
