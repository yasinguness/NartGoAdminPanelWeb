import { FormControl, InputLabel, Select, MenuItem, SelectProps, FormHelperText } from '@mui/material';

interface FormSelectProps extends Pick<SelectProps, 'fullWidth' | 'size' | 'required' | 'disabled' | 'name' | 'id' | 'multiple' | 'value' | 'onChange'> {
    label?: string;
    error?: boolean;
    helperText?: string;
    options: { value: any; label: string }[];
    variant?: 'outlined' | 'filled' | 'standard';
}

export const FormSelect = ({
    label,
    error,
    helperText,
    options,
    fullWidth = true,
    variant = 'outlined',
    ...props
}: FormSelectProps) => {
    return (
        <FormControl fullWidth={fullWidth} error={error} variant={variant}>
            {label && <InputLabel>{label}</InputLabel>}
            <Select label={label} {...props}>
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
        </FormControl>
    );
};

export default FormSelect;
