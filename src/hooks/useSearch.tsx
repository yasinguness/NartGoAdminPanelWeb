import { useState } from 'react';
import useDebounce from './useDebounce';

interface UseSearchReturn {
    searchTerm: string;
    debouncedSearchTerm: string;
    handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    clearSearch: () => void;
}

export const useSearch = (debounceDelay: number = 300): UseSearchReturn => {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, debounceDelay);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const clearSearch = () => {
        setSearchTerm('');
    };

    return {
        searchTerm,
        debouncedSearchTerm,
        handleSearchChange,
        clearSearch,
    };
};

export default useSearch;
