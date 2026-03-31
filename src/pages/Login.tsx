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
    Avatar,
    alpha,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Email as EmailIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const { login, isLoading, error } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const validateEmail = () => {
        if (email && !EMAIL_REGEX.test(email)) {
            setEmailError('Geçerli bir e-posta adresi girin');
        } else {
            setEmailError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        if (!EMAIL_REGEX.test(email)) {
            setEmailError('Geçerli bir e-posta adresi girin');
            return;
        }
        try {
            await login({ email, password });
        } catch {
            // Error handled by useAuth hook
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
            <Container
                component="main"
                maxWidth={false}
                sx={{
                    width: '100vw',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    p: 0,
                }}
            >
                <Paper
                    elevation={24}
                    sx={{
                        padding: { xs: 3, sm: 5 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: { xs: '100%', sm: 420 },
                        maxWidth: 480,
                        borderRadius: 3,
                        background: alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(20px)',
                        m: { xs: 0, sm: 4 },
                    }}
                >
                    {/* Logo */}
                    <Avatar
                        sx={{
                            width: 56,
                            height: 56,
                            bgcolor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            mb: 2,
                            boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                        }}
                    >
                        N
                    </Avatar>

                    <Box
                        sx={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            mb: 4,
                        }}
                    >
                        <Typography
                            component="h1"
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                color: theme.palette.primary.main,
                                mb: 0.5,
                                letterSpacing: -0.5,
                            }}
                        >
                            Nartgo
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            align="center"
                            sx={{ fontWeight: 500 }}
                        >
                            Yönetim paneline giriş yapın
                        </Typography>
                    </Box>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2.5,
                        }}
                    >
                        {error && (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                {error.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.'}
                            </Alert>
                        )}

                        <TextField
                            required
                            fullWidth
                            id="email"
                            label="E-posta Adresi"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError('');
                            }}
                            onBlur={validateEmail}
                            error={!!emailError}
                            helperText={emailError}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailIcon color={emailError ? 'error' : 'primary'} />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            required
                            fullWidth
                            name="password"
                            label="Şifre"
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
                                            type="button"
                                            aria-label="şifre görünürlüğünü değiştir"
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
                            disabled={isLoading || !email || !password}
                            sx={{
                                mt: 1,
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 700,
                                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                                '&:hover': {
                                    boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                                },
                            }}
                        >
                            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}
