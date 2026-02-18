import { useState, useCallback } from 'react';

type ValidationRule<T> = {
    required?: boolean;
    pattern?: RegExp;
    custom?: (value: T) => string | null;
    minLength?: number;
    maxLength?: number;
};

type ValidationRules<T> = {
    [K in keyof T]?: ValidationRule<T[K]>;
};

interface UseFormReturn<T> {
    values: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;
    handleChange: (name: keyof T, value: T[keyof T]) => void;
    handleBlur: (name: keyof T) => void;
    setValues: (values: T) => void;
    resetForm: () => void;
    validate: () => boolean;
}

export const useForm = <T extends Record<string, any>>(
    initialValues: T,
    validationRules?: ValidationRules<T>
): UseFormReturn<T> => {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

    const validateField = useCallback(
        (name: keyof T, value: any): string | null => {
            const rules = validationRules?.[name];
            if (!rules) return null;

            if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
                return 'This field is required';
            }

            if (rules.pattern && !rules.pattern.test(value)) {
                return 'Invalid format';
            }

            if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
                return `Minimum length is ${rules.minLength}`;
            }

            if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                return `Maximum length is ${rules.maxLength}`;
            }

            if (rules.custom) {
                return rules.custom(value);
            }

            return null;
        },
        [validationRules]
    );

    const handleChange = useCallback((name: keyof T, value: T[keyof T]) => {
        setValues((prev) => ({ ...prev, [name]: value }));
        if (touched[name]) {
            const error = validateField(name, value);
            setErrors((prev) => ({ ...prev, [name]: error || '' }));
        }
    }, [touched, validateField]);

    const handleBlur = useCallback((name: keyof T) => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        const error = validateField(name, values[name]);
        setErrors((prev) => ({ ...prev, [name]: error || '' }));
    }, [values, validateField]);

    const setValuesHandler = useCallback((newValues: T) => {
        setValues(newValues);
    }, []);

    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    }, [initialValues]);

    const validate = useCallback((): boolean => {
        const newErrors: Partial<Record<keyof T, string>> = {};
        let isValid = true;

        Object.keys(values).forEach((key) => {
            const error = validateField(key as keyof T, values[key as keyof T]);
            if (error) {
                newErrors[key as keyof T] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    }, [values, validateField]);

    return {
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setValues: setValuesHandler,
        resetForm,
        validate,
    };
};

export default useForm;
