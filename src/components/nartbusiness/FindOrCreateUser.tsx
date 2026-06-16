import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  nbAdminService,
  type NbUserSearchResult,
} from '../../services/nartbusiness/nbAdminService';
import NbStatusBadge, { nbStatusMeta } from './NbStatusBadge';

/** Salt rakam telefonu okunabilir gruplara böler: +90 545 456 64 40. */
function formatPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Sadece + ve rakamları al
  const cleaned = trimmed.replace(/[^\d+]/g, '');
  // +CC AAA BBB CC DD pattern (Türkiye için tipik)
  const m = cleaned.match(/^(\+?\d{1,3})?(\d{3})(\d{3})(\d{2})(\d{2,3})$/);
  if (!m) return trimmed; // tanınmadıysa olduğu gibi göster
  const [, cc, a, b, c, d] = m;
  return [cc, a, b, c, d].filter(Boolean).join(' ');
}

/**
 * "Mevcut NartGo kullanıcısını seç" + "Yeni kullanıcı oluştur" birleşik bileşeni.
 *
 * - Mevcut mod: debounced (300ms) arama, min 3 karakter, zenginleştirilmiş kartlar
 *   (avatar, isim, email, telefon, NartGo üyelik tarihi, NB durum çipi)
 * - Çakışma: zaten NB üyesi olan kullanıcı seçilirse Alert + disabled
 * - Yeni mod: email blur'da duplicate kontrolü → varsa tek-tıkla mevcut moduna geç
 *
 * Caller bu bileşenin durumunu yukarı yansıtır (controlled component) — wizard
 * step validation'ı için.
 */

export interface FindOrCreateUserValue {
  mode: 'existing' | 'new';
  selectedUser: NbUserSearchResult | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface Props {
  value: FindOrCreateUserValue;
  onChange: (v: FindOrCreateUserValue) => void;
  /** "new" modunu hiç gösterme (ör. verification akışında sadece existing user var). */
  allowCreate?: boolean;
  disabled?: boolean;
}

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function userInitial(u: NbUserSearchResult): string {
  const raw = u.firstName ?? u.displayName ?? u.email ?? '?';
  const name = (raw ?? '?').trim();
  return (name || '?').charAt(0).toUpperCase();
}

function userDisplayName(u: NbUserSearchResult): string {
  const name = [u.firstName, u.lastName]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(' ')
    .trim();
  return name || u.displayName || u.email || '(isim/email eksik)';
}

function formatTrDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  } catch {
    return null;
  }
}

export function isFindOrCreateValid(v: FindOrCreateUserValue): boolean {
  if (v.mode === 'existing') {
    return !!v.selectedUser && !v.selectedUser.nbMemberConflict;
  }
  return (
    !!v.email &&
    EMAIL_RX.test(v.email) &&
    !!v.firstName.trim() &&
    !!v.lastName.trim()
  );
}

export default function FindOrCreateUser({
  value,
  onChange,
  allowCreate = true,
  disabled,
}: Props) {
  const [searchInput, setSearchInput] = useState(value.selectedUser?.email ?? '');
  const [options, setOptions] = useState<NbUserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailLookupLoading, setEmailLookupLoading] = useState(false);
  const [emailDuplicate, setEmailDuplicate] = useState<NbUserSearchResult | null>(null);

  const update = useCallback(
    (patch: Partial<FindOrCreateUserValue>) => onChange({ ...value, ...patch }),
    [value, onChange],
  );

  // Debounced search (existing mode)
  useEffect(() => {
    if (value.mode !== 'existing') return;
    const q = (searchInput ?? '').trim();
    if (q.length < 3) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await nbAdminService.searchUsers(q, 20);
        setOptions(r);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, value.mode]);

  // Email blur duplicate check (new mode)
  const checkDuplicate = useCallback(async () => {
    if (value.mode !== 'new') return;
    const email = value.email.trim().toLowerCase();
    if (!email || !EMAIL_RX.test(email)) {
      setEmailDuplicate(null);
      return;
    }
    setEmailLookupLoading(true);
    try {
      const existing = await nbAdminService.lookupUserByEmail(email);
      setEmailDuplicate(existing);
    } catch {
      setEmailDuplicate(null);
    } finally {
      setEmailLookupLoading(false);
    }
  }, [value.mode, value.email]);

  const switchToExisting = useCallback(() => {
    if (!emailDuplicate || !emailDuplicate.userId) return;
    // Boş/null email → state'i undefined yapıp render'da .trim() crash'i tetikleme
    setSearchInput(emailDuplicate.email ?? '');
    setOptions([emailDuplicate]);
    update({
      mode: 'existing',
      selectedUser: emailDuplicate,
      email: '',
      firstName: '',
      lastName: '',
    });
    setEmailDuplicate(null);
  }, [emailDuplicate, update]);

  const emailValid = !!value.email && EMAIL_RX.test(value.email);

  return (
    <Stack spacing={2.5}>
      {allowCreate && (
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={value.mode}
          onChange={(_, newMode: 'existing' | 'new' | null) => {
            if (!newMode) return;
            if (newMode === 'new') {
              update({ mode: newMode, selectedUser: null });
              setSearchInput('');
              setOptions([]);
            } else {
              update({ mode: newMode, email: '', firstName: '', lastName: '' });
              setEmailDuplicate(null);
            }
          }}
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 500,
              py: 1,
              fontSize: '0.875rem',
            },
            '& .MuiToggleButton-root.Mui-selected': {
              fontWeight: 600,
            },
          }}
        >
          <ToggleButton value="existing" disabled={disabled}>
            NartGo'da kayıtlı kullanıcı
          </ToggleButton>
          <ToggleButton value="new" disabled={disabled}>
            Yeni kullanıcı oluştur (Keycloak + email doğrulama)
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      {value.mode === 'existing' ? (
        <>
          <Autocomplete<NbUserSearchResult>
            size="small"
            fullWidth
            disabled={disabled}
            options={options}
            loading={loading}
            value={value.selectedUser}
            onChange={(_, v) => update({ selectedUser: v })}
            inputValue={searchInput}
            onInputChange={(_, v) => setSearchInput(v)}
            getOptionLabel={userDisplayName}
            isOptionEqualToValue={(a, b) => a.userId === b.userId}
            filterOptions={(x) => x}
            getOptionDisabled={(opt) => !!opt.nbMemberConflict}
            noOptionsText={
              (searchInput ?? '').trim().length < 3
                ? 'En az 3 karakter yaz'
                : loading
                ? 'Aranıyor…'
                : allowCreate
                ? 'Eşleşme yok — yukarıdan "Yeni kullanıcı oluştur"u seç'
                : 'Eşleşme yok'
            }
            renderOption={(props, opt) => {
              const tenureLabel = formatTrDate(opt.createdAt);
              return (
                <Box
                  component="li"
                  {...props}
                  key={opt.userId}
                  sx={{ alignItems: 'flex-start !important', gap: 1.5, py: 1 }}
                >
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light' }}>
                    {userInitial(opt)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      <b>{userDisplayName(opt)}</b>{' '}
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        &lt;{opt.email}&gt;
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {opt.phone ? `☎ ${formatPhone(opt.phone)} · ` : ''}
                      {tenureLabel ? `NartGo üye: ${tenureLabel}` : 'Kayıt tarihi yok'}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 'auto', textAlign: 'right', flexShrink: 0 }}>
                    <NbStatusBadge
                      status={opt.nbMemberStatus}
                      conflict={opt.nbMemberConflict}
                    />
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="NartGo Kullanıcısı Ara"
                placeholder="Email, ad veya soyad — en az 3 karakter"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loading ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          {value.selectedUser?.nbMemberConflict && (
            <Alert severity="warning">
              Bu kullanıcı zaten NB üyesi (
              <b>{nbStatusMeta(value.selectedUser.nbMemberStatus).label}</b>). Yeni
              manuel üyelik oluşturulamaz. Lütfen başka bir kullanıcı seç.
            </Alert>
          )}
        </>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Email *"
                fullWidth
                size="small"
                type="email"
                disabled={disabled}
                value={value.email}
                onChange={(e) => {
                  update({ email: e.target.value.trim().toLowerCase() });
                  setEmailDuplicate(null);
                }}
                onBlur={checkDuplicate}
                error={!!value.email && !emailValid}
                helperText={
                  value.email && !emailValid ? 'Geçerli bir email adresi gir' : ' '
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {emailLookupLoading ? (
                        <Tooltip title="Duplicate kontrol ediliyor…">
                          <CircularProgress size={16} />
                        </Tooltip>
                      ) : emailDuplicate ? (
                        <Tooltip
                          title={
                            emailDuplicate.nbMemberConflict
                              ? 'Bu email zaten NB üyesi — yeni kayıt oluşturulamaz'
                              : 'Bu email NartGo\'da kayıtlı — mevcut kullanıcıya geçebilirsin'
                          }
                        >
                          <WarningAmberIcon
                            fontSize="small"
                            color={emailDuplicate.nbMemberConflict ? 'error' : 'warning'}
                          />
                        </Tooltip>
                      ) : value.email && emailValid ? (
                        <Tooltip title="Email kullanılabilir">
                          <CheckCircleIcon fontSize="small" color="success" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Email odaktan çıkınca duplicate kontrol yapılır">
                          <Box
                            component="span"
                            sx={{
                              fontSize: 14,
                              color: 'text.disabled',
                              cursor: 'help',
                            }}
                          >
                            ⓘ
                          </Box>
                        </Tooltip>
                      )}
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Ad *"
                fullWidth
                size="small"
                disabled={disabled}
                value={value.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Soyad *"
                fullWidth
                size="small"
                disabled={disabled}
                value={value.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Telefon"
                fullWidth
                size="small"
                disabled={disabled}
                value={value.phone}
                onChange={(e) => update({ phone: e.target.value.trim() })}
                placeholder="+90 5XX XXX XX XX"
                helperText="Opsiyonel — üye ile iletişim için"
                inputProps={{ inputMode: 'tel' }}
              />
            </Grid>
          </Grid>

          {emailDuplicate && (
            <Alert
              severity={emailDuplicate.nbMemberConflict ? 'error' : 'warning'}
              action={
                !emailDuplicate.nbMemberConflict && (
                  <Button color="inherit" size="small" onClick={switchToExisting}>
                    Mevcut kullanıcıyı seç
                  </Button>
                )
              }
            >
              <Typography variant="body2">
                Bu email zaten NartGo'da kayıtlı:{' '}
                <b>{userDisplayName(emailDuplicate)}</b>
                {emailDuplicate.nbMemberStatus && (
                  <>
                    {' '}
                    — NB durumu:{' '}
                    <b>{nbStatusMeta(emailDuplicate.nbMemberStatus).label}</b>
                  </>
                )}
              </Typography>
              {emailDuplicate.nbMemberConflict ? (
                <Typography variant="caption">
                  Aktif NB üyelik var — duplicate üye oluşturulamaz.
                </Typography>
              ) : (
                <Typography variant="caption">
                  Duplicate Keycloak hesabı oluşturmamak için "Mevcut kullanıcıyı seç"
                  butonuna tıkla.
                </Typography>
              )}
            </Alert>
          )}
        </>
      )}
    </Stack>
  );
}
