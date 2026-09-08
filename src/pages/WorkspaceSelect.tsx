/**
 * Workspace seçim ekranı — giriş ile panel arasındaki tek soru.
 *
 * Yalnızca iki dünyaya da yetkisi olan kullanıcı (pratikte ADMIN) buraya
 * düşer. Tek workspace yetkisi olan biri için soru anlamsız olurdu, o yüzden
 * doğrudan kendi paneline yönlendirilir — fazladan tık yok.
 *
 * Her kart kendi kimliğiyle temsil edilir: NartGo yeşili, NartBusiness
 * lacivert-altın. Seçim ekranı iki markanın yan yana görüldüğü tek yer
 * olduğu için farkın burada okunması önemli.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Container } from '@mui/material';
import { ArrowForward as ArrowIcon } from '@mui/icons-material';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../hooks/useAuth';
import { useWorkspaceStore } from '../store/workspaceStore';
import { workspacesForRoles, type Workspace } from '../config/workspaces';
import { brand } from '../theme/palette';
import { nb } from '../theme/nbBrand';

/** Kart başına marka renkleri — tema dışında, çünkü ikisi aynı ekranda. */
const CARD_STYLE: Record<string, { bg: string; accent: string; monoBg: string; monoFg: string }> = {
    nartgo: {
        bg: '#0F1A14',
        accent: brand.secondary,
        monoBg: brand.secondary,
        monoFg: '#0F1A14',
    },
    nartbusiness: {
        bg: nb.navyDeep,
        accent: nb.goldSoft,
        monoBg: nb.goldSoft,
        monoFg: nb.navyDeep,
    },
};

export default function WorkspaceSelect() {
    const navigate = useNavigate();
    const { roles, userName } = useRole();
    const { logout } = useAuth();
    const setLastWorkspace = useWorkspaceStore((s) => s.setLastWorkspace);
    const lastWorkspaceId = useWorkspaceStore((s) => s.lastWorkspaceId);

    const available = workspacesForRoles(roles);

    // Seçecek bir şey yoksa soruyu sorma. Tek workspace'i olan doğrudan
    // girer; hiçbiri yoksa yetkisiz demektir, girişe geri döner.
    useEffect(() => {
        if (available.length === 1) {
            setLastWorkspace(available[0].id);
            navigate(available[0].defaultPath, { replace: true });
        } else if (available.length === 0 && roles.length > 0) {
            navigate('/login', { replace: true });
        }
    }, [available, navigate, setLastWorkspace, roles.length]);

    const choose = (w: Workspace) => {
        setLastWorkspace(w.id);
        navigate(w.defaultPath, { replace: true });
    };

    if (available.length !== 2) return null;

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#0B0F14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
            }}
        >
            <Container maxWidth="md">
                <Box sx={{ textAlign: 'center', mb: 5 }}>
                    <Typography
                        sx={{
                            fontSize: 10,
                            letterSpacing: 2,
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.35)',
                            mb: 1,
                        }}
                    >
                        YÖNETİM PANELİ
                    </Typography>
                    <Typography
                        component="h1"
                        sx={{
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            fontStyle: 'italic',
                            fontSize: { xs: 26, sm: 32 },
                            fontWeight: 700,
                            color: 'white',
                            lineHeight: 1.2,
                        }}
                    >
                        Hangi panele girmek istiyorsun?
                    </Typography>
                    <Typography sx={{ mt: 1.5, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                        {userName ? `${userName} · ` : ''}İki panele de yetkin var. Sonradan üstten değiştirebilirsin.
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 2.5,
                    }}
                >
                    {available.map((w) => {
                        const c = CARD_STYLE[w.id];
                        const isLast = lastWorkspaceId === w.id;

                        return (
                            <Box
                                key={w.id}
                                component="button"
                                type="button"
                                onClick={() => choose(w)}
                                aria-label={`${w.name} paneline gir`}
                                sx={{
                                    position: 'relative',
                                    textAlign: 'left',
                                    font: 'inherit',
                                    fontFamily: 'inherit',
                                    cursor: 'pointer',
                                    p: 3,
                                    borderRadius: 3,
                                    bgcolor: c.bg,
                                    border: `1px solid ${isLast ? c.accent : 'rgba(255,255,255,0.1)'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5,
                                    minHeight: 240,
                                    transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        borderColor: c.accent,
                                        boxShadow: `0 12px 32px -12px ${c.accent}`,
                                    },
                                    '&:focus-visible': {
                                        outline: `2px solid ${c.accent}`,
                                        outlineOffset: 3,
                                    },
                                }}
                            >
                                {isLast && (
                                    <Typography
                                        sx={{
                                            position: 'absolute',
                                            top: 14,
                                            right: 16,
                                            fontSize: 9,
                                            letterSpacing: 1.2,
                                            fontWeight: 700,
                                            color: c.accent,
                                        }}
                                    >
                                        SON KULLANDIĞIN
                                    </Typography>
                                )}

                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '50%',
                                        bgcolor: c.monoBg,
                                        color: c.monoFg,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: w.monogram.length > 1 ? 15 : 18,
                                    }}
                                >
                                    {w.monogram}
                                </Box>

                                <Box>
                                    <Typography
                                        sx={{ fontSize: 20, fontWeight: 700, color: 'white', lineHeight: 1.2 }}
                                    >
                                        {w.name}
                                    </Typography>
                                    <Typography
                                        sx={{ fontSize: 12, color: c.accent, fontWeight: 600, mt: 0.4 }}
                                    >
                                        {w.tagline}
                                    </Typography>
                                </Box>

                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: 'rgba(255,255,255,0.55)',
                                        lineHeight: 1.6,
                                        flex: 1,
                                    }}
                                >
                                    {w.description}
                                </Typography>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: c.accent }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Panele gir</Typography>
                                    <ArrowIcon sx={{ fontSize: 16 }} />
                                </Box>
                            </Box>
                        );
                    })}
                </Box>

                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Box
                        component="button"
                        type="button"
                        onClick={() => { void logout(); }}
                        sx={{
                            background: 'none',
                            border: 'none',
                            font: 'inherit',
                            fontFamily: 'inherit',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            '&:hover': { color: 'rgba(255,255,255,0.7)' },
                        }}
                    >
                        Çıkış yap
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
