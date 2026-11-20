import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { userSearchService, type UserRow } from '../../services/user/userSearchService';
import { apiMessage } from './userFormat';

export default function PasswordDialog({ target, onClose }: { target: UserRow; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { enqueueSnackbar } = useSnackbar();
  const valid = password.length >= 8 && password !== password.toUpperCase() && password !== password.toLowerCase() && /\d/.test(password) && password === repeat;
  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await userSearchService.setPassword(target.id, password);
      enqueueSnackbar('Hesap şifresi değiştirildi.', { variant: 'success' });
      onClose();
    } catch (e) {
      setError(apiMessage(e) || 'Şifre değiştirilemedi.');
    } finally {
      setBusy(false);
    }
  }
  return <Dialog open fullWidth maxWidth="xs" aria-labelledby="password-title" onClose={busy ? undefined : onClose}
    PaperProps={{ sx: { m: 2, width: 'calc(100% - 32px)' } }}>
    <form onSubmit={e => { e.preventDefault(); void submit(); }}>
      <DialogTitle id="password-title">Şifre değiştir</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography sx={{ overflowWrap: 'anywhere' }}>{target.name} · {target.email}</Typography>
        <TextField autoFocus required disabled={busy} type="password" autoComplete="new-password" label="Yeni şifre" value={password}
          helperText="En az 8 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın." onChange={e => setPassword(e.target.value)} />
        <TextField required disabled={busy} type="password" autoComplete="new-password" label="Yeni şifreyi tekrar girin" value={repeat}
          error={!!repeat && repeat !== password} helperText={repeat && repeat !== password ? 'Şifreler eşleşmiyor.' : undefined} onChange={e => setRepeat(e.target.value)} />
        {error && <Typography role="alert" color="error">{error}</Typography>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={onClose}>Vazgeç</Button><Button type="submit" variant="contained" disabled={!valid || busy}>Kaydet</Button></DialogActions>
    </form>
  </Dialog>;
}
