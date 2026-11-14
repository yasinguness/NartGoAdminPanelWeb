import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { userService } from '../../services/user/userService';
import { AccountType } from '../../types/users/userModel';
import { au } from '../../theme/adminUsers';
import { apiMessage } from './userFormat';

/** "Yeni kullanıcı": Keycloak ve veritabanında hesap açar (mevcut POST /auth/admin/users). */
export default function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', password: '', accountType: AccountType.INDIVIDUAL as AccountType, companyName: '' });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = /\S+@\S+\.\S+/.test(form.email) && form.firstName.trim() && form.password.length >= 8
    && (form.accountType !== AccountType.BUSINESS || form.companyName.trim());

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const u = await userService.createUserAsAdmin({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        password: form.password,
        accountType: form.accountType,
        companyName: form.accountType === AccountType.BUSINESS ? form.companyName.trim() : undefined,
      });
      enqueueSnackbar('Kullanıcı oluşturuldu', { variant: 'success' });
      onCreated(String(u.id));
    } catch (e) {
      enqueueSnackbar(apiMessage(e) ?? 'Kullanıcı oluşturulamadı', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Yeni kullanıcı</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="E-posta" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoFocus />
          <Stack direction="row" spacing={2}>
            <TextField label="Ad" fullWidth value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            <TextField label="Soyad" fullWidth value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </Stack>
          <TextField label="Geçici şifre" type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
            helperText="En az 8 karakter. Kullanıcı ilk girişte değiştirir." />
          <TextField select label="Hesap türü" value={form.accountType} onChange={(e) => set('accountType', e.target.value)}>
            <MenuItem value={AccountType.INDIVIDUAL}>Bireysel</MenuItem>
            <MenuItem value={AccountType.BUSINESS}>İşletme</MenuItem>
          </TextField>
          {form.accountType === AccountType.BUSINESS && (
            <TextField label="Firma adı" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
          )}
          <Typography sx={{ fontSize: 12.5, color: au.muted }}>Oluşturma denetim kaydına yazılır.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" disabled={!valid || busy} onClick={submit} sx={{ bgcolor: au.primary }}>Oluştur</Button>
      </DialogActions>
    </Dialog>
  );
}
