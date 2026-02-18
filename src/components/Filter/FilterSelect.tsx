/**
 * FilterSelect Component
 * 
 * A standardized select dropdown for filtering.
 * 
 * Usage:
 * ```tsx
 * <FilterSelect
 *   label="Status"
 *   value={statusFilter}
 *   onChange={setStatusFilter}
 *   options={[
 *     { value: '', label: 'All Statuses' },
 *     { value: 'active', label: 'Active' },
 *     { value: 'inactive', label: 'Inactive' },
 *   ]}
 * />
 * ```
 */

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  SelectProps,
} from '@mui/material';

export interface FilterOption {
  /** Option value */
  value: string | number;
  /** Display label */
  label: string;
  /** Disabled state */
  disabled?: boolean;
}

interface FilterSelectProps extends Omit<SelectProps, 'onChange' | 'value'> {
  /** Filter label */
  label: string;
  /** Current value */
  value: string | number;
  /** Change handler */
  onChange: (value: string) => void;
  /** Options list */
  options: FilterOption[];
  /** Minimum width */
  minWidth?: number;
  /** Show "All" option as first option */
  showAllOption?: boolean;
  /** Label for "All" option */
  allOptionLabel?: string;
}

export default function FilterSelect({
  label,
  value,
  onChange,
  options,
  minWidth = 150,
  showAllOption = false,
  allOptionLabel = 'All',
  size = 'small',
  sx,
  ...selectProps
}: FilterSelectProps) {
  const handleChange = (event: SelectChangeEvent<unknown>) => {
    onChange(event.target.value as string);
  };

  // Combine all option with provided options
  const allOptions: FilterOption[] = showAllOption
    ? [{ value: '', label: allOptionLabel }, ...options]
    : options;

  return (
    <FormControl size={size} sx={{ minWidth, ...sx }}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        onChange={handleChange}
        label={label}
        {...selectProps}
      >
        {allOptions.map((option) => (
          <MenuItem
            key={String(option.value)}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
