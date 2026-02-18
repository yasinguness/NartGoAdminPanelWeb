import { LocalizationProvider, DatePicker as MuiDatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextFieldProps } from '@mui/material';

interface FormDatePickerProps {
    label?: string;
    value: Date | null;
    onChange: (date: Date | null) => void;
    textFieldProps?: Partial<TextFieldProps>;
    minDate?: Date;
    maxDate?: Date;
    disabled?: boolean;
}

export const FormDatePicker = ({
    label,
    value,
    onChange,
    textFieldProps,
    minDate,
    maxDate,
    disabled = false,
    ...props
}: FormDatePickerProps) => {
    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <MuiDatePicker
                label={label}
                value={value}
                onChange={onChange}
                minDate={minDate}
                maxDate={maxDate}
                disabled={disabled}
                slotProps={{
                    textField: {
                        fullWidth: true,
                        ...textFieldProps,
                    },
                }}
                {...props}
            />
        </LocalizationProvider>
    );
};

export default FormDatePicker;
