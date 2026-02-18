/**
 * SearchInput Component
 * 
 * A search text field with debouncing built-in.
 * Includes search icon, clear button, and loading indicator.
 * 
 * Usage:
 * ```tsx
 * <SearchInput
 *   placeholder="Search users..."
 *   value={search}
 *   onChange={setSearch}
 *   debounceMs={500}
 * />
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  TextFieldProps,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface SearchInputProps extends Omit<TextFieldProps, 'onChange' | 'value'> {
  /** Current search value */
  value: string;
  /** Change handler (receives debounced value) */
  onChange: (value: string) => void;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Show loading indicator */
  loading?: boolean;
  /** Clear button click handler */
  onClear?: () => void;
  /** Minimum characters before triggering onChange */
  minChars?: number;
}

export default function SearchInput({
  value,
  onChange,
  debounceMs = 500,
  loading = false,
  onClear,
  minChars = 0,
  placeholder = 'Search...',
  size = 'small',
  sx,
  ...textFieldProps
}: SearchInputProps) {
  // Internal value for immediate display
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal value when external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounced onChange handler
  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalValue.length >= minChars || internalValue.length === 0) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [internalValue, debounceMs, minChars, onChange]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  };

  // Handle clear
  const handleClear = () => {
    setInternalValue('');
    onChange('');
    onClear?.();
  };

  return (
    <TextField
      value={internalValue}
      onChange={handleChange}
      placeholder={placeholder}
      size={size}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {loading ? (
              <CircularProgress size={18} />
            ) : internalValue ? (
              <IconButton
                size="small"
                onClick={handleClear}
                edge="end"
                aria-label="clear search"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ) : null}
          </InputAdornment>
        ),
      }}
      sx={{
        minWidth: 200,
        maxWidth: 400,
        ...sx,
      }}
      {...textFieldProps}
    />
  );
}
