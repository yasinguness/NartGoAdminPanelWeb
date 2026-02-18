import { useState } from 'react';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Paper,
    Alert,
    InputAdornment,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Email as EmailIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login, isLoading, error } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log('=== LOGIN FORM SUBMITTED ===');
        console.log('Form values:', {
            email,
            password: password ? '***' : undefined,
            passwordLength: password.length,
            emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        });

        if (!email || !password) {
            console.error('Validation failed - Email or password is empty');
            return;
        }

        console.log('Validation passed - Calling login()');
        try {
            await login({ email, password });
            console.log('Login call completed');
        } catch (err) {
            console.error('=== LOGIN FORM ERROR ===');
            console.error('Error in login form:', err);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                width: '100vw',
            }}
        >
            <Container component="main" maxWidth={false} sx={{ width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', p: 0 }}>
                <Paper
                    elevation={24}
                    sx={{
                        padding: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: { xs: '100%', sm: 400 },
                        maxWidth: 480,
                        borderRadius: 2,
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(10px)',
                        m: { xs: 0, sm: 4 },
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            mb: 3,
                        }}
                    >
                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{
                                fontWeight: 'bold',
                                color: theme.palette.primary.main,
                                mb: 1,
                            }}
                        >
                            Nartgo Admin
                        </Typography>
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            align="center"
                        >
                            Welcome back! Please sign in to your account.
                        </Typography>
                    </Box>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}
                    >
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error.message}
                            </Alert>
                        )}

                        <TextField
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailIcon color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon color="primary" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={isLoading}
                            sx={{
                                mt: 2,
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                boxShadow: 3,
                                '&:hover': {
                                    boxShadow: 4,
                                },
                            }}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
} 