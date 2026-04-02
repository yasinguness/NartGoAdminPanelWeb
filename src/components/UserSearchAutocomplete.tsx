import { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  Avatar,
  Stack,
  Typography,
  Box,
  CircularProgress,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { userService } from '../services/user/userService';
import { UserDTO, UserStatusEnum } from '../types/users/userModel';

interface UserSearchAutocompleteProps {
  value: UserDTO | null;
  onChange: (user: UserDTO | null) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  error?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export default function UserSearchAutocomplete({
  value,
  onChange,
  label = 'Kullanıcı Seç',
  placeholder = 'İsim veya e-posta ile ara...',
  helperText,
  required = false,
  error = false,
  disabled = false,
  size = 'small',
}: UserSearchAutocompleteProps) {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = useCallback(async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await userService.getAllUsers({
        keyword,
        page: 0,
        size: 10,
        status: UserStatusEnum.ACTIVE,
      });
      setOptions(res.data?.content || []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(inputValue);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue, searchUsers]);

  const getDisplayName = (user: UserDTO) => {
    if (user.displayName) return user.displayName;
    const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return full || user.email;
  };

  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      options={options}
      loading={loading}
      disabled={disabled}
      getOptionLabel={(option) => getDisplayName(option)}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      noOptionsText={inputValue.length < 2 ? 'En az 2 karakter yazın...' : 'Kullanıcı bulunamadı'}
      loadingText="Aranıyor..."
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          required={required}
          error={error}
          size={size}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress size={18} sx={{ mr: 1 }} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5, width: '100%' }}>
            <Avatar
              src={option.imageUrl}
              sx={{
                width: 36,
                height: 36,
                fontSize: 14,
                fontWeight: 600,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              {option.firstName?.[0] || <PersonIcon sx={{ fontSize: 18 }} />}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {getDisplayName(option)}
                </Typography>
                {option.accountType === 'BUSINESS' && (
                  <Chip label="İşletme" size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" noWrap>
                {option.email}
              </Typography>
            </Box>
            {option.currentCity && (
              <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                {option.currentCity}
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    />
  );
}
