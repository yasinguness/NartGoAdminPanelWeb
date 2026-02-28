import React, { useState } from 'react';
import {
    Box, Typography, TextField, Stack, Select, MenuItem,
    FormControl, InputLabel, Card, CardContent, IconButton, Tooltip, Chip,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';
import { DeepLinkTarget, DEEP_LINK_ROUTES, buildDeepLink } from '../../../types/notifications/deepLink';

interface DeepLinkBuilderProps {
    value: string;
    onChange: (link: string) => void;
}

export default function DeepLinkBuilder({ value, onChange }: DeepLinkBuilderProps) {
    const [target, setTarget] = useState<DeepLinkTarget>(DeepLinkTarget.EXPLORE);
    const [resourceId, setResourceId] = useState('');

    const handleTargetChange = (t: DeepLinkTarget) => {
        setTarget(t);
        const route = DEEP_LINK_ROUTES[t];
        if (!route.requiresId) {
            onChange(route.template);
            setResourceId('');
        } else if (resourceId) {
            const dl = buildDeepLink(t, resourceId);
            onChange(dl.fullPath);
        }
    };

    const handleIdChange = (id: string) => {
        setResourceId(id);
        if (id) {
            const dl = buildDeepLink(target, id);
            onChange(dl.fullPath);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
    };

    return (
        <Card variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Deep Link Oluşturucu</Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Hedef Sayfa</InputLabel>
                    <Select value={target} label="Hedef Sayfa"
                        onChange={(e) => handleTargetChange(e.target.value as DeepLinkTarget)}>
                        {Object.entries(DEEP_LINK_ROUTES).map(([key, route]) => (
                            <MenuItem key={key} value={key}>
                                {route.label} — <Typography component="span" sx={{ fontFamily: 'monospace', ml: 0.5, fontSize: '0.75rem' }}>{route.template}</Typography>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {DEEP_LINK_ROUTES[target]?.requiresId && (
                    <TextField size="small" label="Kaynak ID" value={resourceId}
                        onChange={(e) => handleIdChange(e.target.value)}
                        placeholder="Ör: abc123" sx={{ flex: 1 }} />
                )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Chip label={value || '/explore'} variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', flexGrow: 1 }} />
                <Tooltip title="Kopyala">
                    <IconButton size="small" onClick={copyToClipboard}><CopyIcon fontSize="small" /></IconButton>
                </Tooltip>
            </Stack>
        </Card>
    );
}
