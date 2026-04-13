import { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Alert,
    InputAdornment,
    IconButton,
    useTheme,
    useMediaQuery,
    alpha,
    CircularProgress,
    Stack,
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
    const assetBaseUrl = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;
    const backgroundImageUrl = `url(${assetBaseUrl}background.jpg)`;
    const logoUrl = `${assetBaseUrl}NartGo_icon.svg`;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const { login, isLoading, error } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const validateEmail = () => {
        if (email && !EMAIL_REGEX.test(email)) {
            setEmailError('Gecerli bir e-posta adresi girin');
        } else {
            setEmailError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        if (!EMAIL_REGEX.test(email)) {
            setEmailError('Gecerli bir e-posta adresi girin');
            return;
        }
        try {
            await login({ email, password });
        } catch {
            // Error handled by useAuth hook
        }
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
            {/* Sol — Arkaplan gorseli */}
            {!isMobile && (
                <Box
                    sx={{
                        flex: 1,
                        position: 'relative',
                        backgroundImage: backgroundImageUrl,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {/* Koyu gradient overlay */}
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(13,31,18,0.7) 0%, rgba(13,31,18,0.4) 50%, rgba(13,31,18,0.6) 100%)',
                        }}
                    />

                    {/* Sol alt branding */}
                    <Box sx={{ position: 'absolute', bottom: 48, left: 48, zIndex: 1 }}>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                            <Box
                                component="img"
                                src={logoUrl}
                                alt="NartGo"
                                sx={{ width: 36, height: 36, filter: 'brightness(0) invert(1)' }}
                            />
                            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, letterSpacing: -0.5 }}>
                                NartGo
                            </Typography>
                        </Stack>
                        <Typography
                            variant="h4"
                            sx={{
                                color: '#fff',
                                fontWeight: 800,
                                lineHeight: 1.2,
                                maxWidth: 400,
                                mb: 1.5,
                            }}
                        >
                            Kuzey Kafkasya
                            <br />
                            Diaspora Platformu
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 360 }}>
                            Etkinlik, topluluk ve kulturel miras yonetimi icin tek platform.
                        </Typography>
                    </Box>

                    {/* Sol ust copyright */}
                    <Typography
                        variant="caption"
                        sx={{
                            position: 'absolute',
                            bottom: 20,
                            right: 24,
                            color: 'rgba(255,255,255,0.35)',
                            fontSize: 11,
                            zIndex: 1,
                        }}
                    >
                        NartGo
                    </Typography>
                </Box>
            )}

            {/* Sag — Giris formu */}
            <Box
                sx={{
                    width: { xs: '100%', md: 480 },
                    minWidth: { md: 480 },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    px: { xs: 3, sm: 6 },
                    py: 6,
                    bgcolor: 'background.paper',
                    position: 'relative',
                    // Mobilde arkaplan gorseli
                    ...(isMobile && {
                        backgroundImage: backgroundImageUrl,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }),
                }}
            >
                {/* Mobil overlay */}
                {isMobile && (
                    <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' }} />
                )}

                <Box sx={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>
                    {/* Logo + Baslik */}
                    <Box sx={{ textAlign: 'center', mb: 5 }}>
                        <Box
                            component="img"
                            src={logoUrl}
                            alt="NartGo"
                            sx={{ width: 48, height: 48, mb: 2 }}
                        />
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.5 }}>
                            Yonetim Paneli
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Hesabinizla giris yapin
                        </Typography>
                    </Box>

                    {/* Form */}
                    <Box component="form" onSubmit={handleSubmit}>
                        {error && (
                            <Alert
                                severity="error"
                                sx={{ mb: 2.5, borderRadius: 2, fontSize: 13 }}
                            >
                                {error.message || 'Giris basarisiz. Bilgilerinizi kontrol edin.'}
                            </Alert>
                        )}

                        <Stack spacing={2.5}>
                            <TextField
                                required
                                fullWidth
                                id="email"
                                label="E-posta"
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
                                            <EmailIcon sx={{ color: emailError ? 'error.main' : 'text.secondary', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        bgcolor: alpha(theme.palette.grey[100], 0.5),
                                        '&:hover': { bgcolor: alpha(theme.palette.grey[100], 0.8) },
                                        '&.Mui-focused': { bgcolor: 'transparent' },
                                    },
                                }}
                            />

                            <TextField
                                required
                                fullWidth
                                name="password"
                                label="Sifre"
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                size="small"
                                            >
                                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        bgcolor: alpha(theme.palette.grey[100], 0.5),
                                        '&:hover': { bgcolor: alpha(theme.palette.grey[100], 0.8) },
                                        '&.Mui-focused': { bgcolor: 'transparent' },
                                    },
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={isLoading || !email || !password}
                                disableElevation
                                sx={{
                                    py: 1.5,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontSize: 15,
                                    fontWeight: 700,
                                    mt: 0.5,
                                    bgcolor: '#0D1F12',
                                    '&:hover': { bgcolor: '#1a3320' },
                                }}
                            >
                                {isLoading ? (
                                    <CircularProgress size={22} sx={{ color: '#fff' }} />
                                ) : (
                                    'Giris Yap'
                                )}
                            </Button>
                        </Stack>
                    </Box>

                    {/* Alt bilgi */}
                    <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ display: 'block', textAlign: 'center', mt: 4, fontSize: 11 }}
                    >
                        NartGo &copy; {new Date().getFullYear()} &middot; NartGo
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
