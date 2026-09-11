/**
 * Geri-al bildirimi — kalıcı başarı banner'ının yerine geçen şey.
 *
 * Eskiden her başarılı işlem sayfanın üstüne yeşil bir şerit bırakıyordu ve
 * orada kalıyordu. Şerit iki iş yapmıyordu: bir sonraki işlemde tazelenmediği
 * için "bu hangi işlemin onayıydı" belirsizleşiyor, kapatılana kadar da
 * içeriği aşağı itiyordu. Asıl ihtiyaç onay değil, **dönüş yolu**: gönderim
 * yanlış kişiye gittiyse kullanıcının onu geri alacak birkaç saniyesi olmalı.
 *
 * On saniye bilinçli: "yanlış oldu" tepkisi saniyeler içinde gelir, daha
 * uzun bir pencere ekranda gereksiz duran bir kutu demektir. Süre dolunca
 * kutu kendiliğinden kapanır ve işlem kalıcı sayılır.
 *
 * `onUndo` verilmezse kutu düz bilgi olur ve yine kendiliğinden kapanır.
 */

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { nb, nbRadius } from '../../../theme/nbBrand';

/** Geri alma penceresi. */
export const NB_UNDO_MS = 10_000;

export interface NbUndoState {
    message: string;
    /** Verilirse "Geri al" çıkar; süre dolduğunda buton kaybolur. */
    onUndo?: () => void;
}

interface NbUndoToastProps {
    state: NbUndoState | null;
    onClose: () => void;
}

export default function NbUndoToast({ state, onClose }: NbUndoToastProps) {
    const [left, setLeft] = useState(NB_UNDO_MS / 1000);
    // Kapanış geri sayımdan tetiklenir; onClose her render'da yeni referans
    // olabildiği için efektin bağımlılığına konmaz, ref üzerinden okunur.
    const closeRef = useRef(onClose);
    closeRef.current = onClose;

    useEffect(() => {
        if (!state) return;
        setLeft(NB_UNDO_MS / 1000);
        const tick = setInterval(() => {
            setLeft((s) => {
                if (s <= 1) {
                    clearInterval(tick);
                    closeRef.current();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(tick);
    }, [state]);

    if (!state) return null;

    return (
        <Box
            role="status"
            sx={{
                position: 'fixed',
                left: '50%',
                bottom: 26,
                transform: 'translateX(-50%)',
                bgcolor: nb.navy,
                color: nb.onDark,
                borderRadius: `${nbRadius.panel}px`,
                px: 2,
                py: 1.5,
                zIndex: 1400,
                maxWidth: 'calc(100vw - 32px)',
                animation: 'nbRiseIn .2s ease-out',
                '@keyframes nbRiseIn': {
                    from: { opacity: 0, transform: 'translate(-50%, 8px)' },
                    to: { opacity: 1, transform: 'translate(-50%, 0)' },
                },
            }}
        >
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography sx={{ fontSize: 12.5 }}>{state.message}</Typography>
                {state.onUndo && (
                    <Button
                        disableElevation
                        onClick={() => {
                            state.onUndo?.();
                            onClose();
                        }}
                        sx={{
                            border: '1px solid rgba(255,255,255,.25)',
                            color: nb.gold,
                            borderRadius: '6px',
                            px: 1.375,
                            py: 0.625,
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            '&:hover': { bgcolor: 'rgba(255,255,255,.06)' },
                        }}
                    >
                        Geri al · {left}
                    </Button>
                )}
                <Button
                    onClick={onClose}
                    sx={{
                        minWidth: 0,
                        color: nb.onDarkMuted,
                        fontSize: 12,
                        textTransform: 'none',
                        '&:hover': { bgcolor: 'transparent', color: nb.onDark },
                    }}
                >
                    Kapat
                </Button>
            </Stack>
        </Box>
    );
}
