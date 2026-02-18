import { TextField as MuiTextField, TextFieldProps } from '@mui/material';

interface FormFieldProps extends Pick<TextFieldProps, 'fullWidth' | 'variant' | 'size' | 'required' | 'disabled' | 'name' | 'id' | 'type' | 'multiline' | 'rows' | 'maxRows' | 'minRows' | 'placeholder' | 'autoFocus' | 'InputProps' | 'inputProps'> {
    label?: string;
    error?: boolean;
    helperText?: string;
}

export const TextField = ({
    label,
    error,
    helperText,
    fullWidth = true,
    variant = 'outlined',
    ...props
}: FormFieldProps) => {
    return (
        <MuiTextField
            label={label}
            error={error}
            helperText={helperText}
            fullWidth={fullWidth}
            variant={variant}
            {...props}
        />
    );
};

export default TextField;
