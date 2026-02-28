import { AddressDTO } from '../../types/businesses/addressModel';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';

export interface PlacePrediction {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
}

export interface PlaceDetails {
    place_id: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
    address_components: {
        long_name: string;
        short_name: string;
        types: string[];
    }[];
}

let autocompleteService: google.maps.places.AutocompleteService | null = null;
let placesService: google.maps.places.PlacesService | null = null;
let isLoading = false;
let isLoaded = false;

/**
 * Load the Google Maps JavaScript API script dynamically
 */
export const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (isLoaded) {
            resolve();
            return;
        }
        if (isLoading) {
            // Wait for existing load
            const interval = setInterval(() => {
                if (isLoaded) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
            return;
        }

        if (!GOOGLE_API_KEY) {
            console.warn('Google Places API key not set. Set VITE_GOOGLE_PLACES_API_KEY in .env');
            reject(new Error('Google Places API key not set'));
            return;
        }

        isLoading = true;

        // Check if already loaded
        if (window.google?.maps?.places) {
            isLoaded = true;
            isLoading = false;
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            isLoaded = true;
            isLoading = false;
            resolve();
        };

        script.onerror = () => {
            isLoading = false;
            reject(new Error('Failed to load Google Maps script'));
        };

        document.head.appendChild(script);
    });
};

const getAutocompleteService = async (): Promise<google.maps.places.AutocompleteService> => {
    await loadGoogleMapsScript();
    if (!autocompleteService) {
        autocompleteService = new google.maps.places.AutocompleteService();
    }
    return autocompleteService;
};

const getPlacesService = async (): Promise<google.maps.places.PlacesService> => {
    await loadGoogleMapsScript();
    if (!placesService) {
        // PlacesService requires an HTML element
        const div = document.createElement('div');
        placesService = new google.maps.places.PlacesService(div);
    }
    return placesService;
};

/**
 * Search for place predictions using Google Places Autocomplete
 */
export const searchPlaces = async (input: string): Promise<PlacePrediction[]> => {
    if (!input || input.length < 3) return [];

    try {
        const service = await getAutocompleteService();

        return new Promise((resolve) => {
            service.getPlacePredictions(
                {
                    input,
                    types: ['geocode', 'establishment'],
                    componentRestrictions: { country: 'tr' }, // Turkey restriction, modify as needed
                },
                (predictions, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                        resolve(
                            predictions.map((p) => ({
                                place_id: p.place_id,
                                description: p.description,
                                structured_formatting: {
                                    main_text: p.structured_formatting.main_text,
                                    secondary_text: p.structured_formatting.secondary_text,
                                },
                            }))
                        );
                    } else {
                        resolve([]);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Failed to search places:', error);
        return [];
    }
};

/**
 * Get place details and convert to AddressDTO
 */
export const getPlaceDetails = async (placeId: string): Promise<Partial<AddressDTO> | null> => {
    try {
        const service = await getPlacesService();

        return new Promise((resolve) => {
            service.getDetails(
                {
                    placeId,
                    fields: ['geometry', 'address_components', 'formatted_address'],
                },
                (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        const components = place.address_components || [];

                        const getComponent = (type: string): string => {
                            const comp = components.find((c) => c.types.includes(type));
                            return comp?.long_name || '';
                        };

                        const address: Partial<AddressDTO> = {
                            city: getComponent('administrative_area_level_1') || getComponent('locality'),
                            district: getComponent('administrative_area_level_2') || getComponent('sublocality_level_1') || getComponent('sublocality'),
                            country: getComponent('country'),
                            street: `${getComponent('route')} ${getComponent('street_number')}`.trim() || place.formatted_address || '',
                            postalCode: getComponent('postal_code'),
                            latitude: place.geometry?.location?.lat(),
                            longitude: place.geometry?.location?.lng(),
                            description: place.formatted_address || '',
                        };

                        resolve(address);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    } catch (error) {
        console.error('Failed to get place details:', error);
        return null;
    }
};
