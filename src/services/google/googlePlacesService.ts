/**
 * Google Places Service — REST API (no SDK loading required)
 * Uses Places API (New) Autocomplete and Place Details endpoints.
 */
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

/**
 * Search for place predictions using Places Autocomplete REST API
 */
export const searchPlaces = async (input: string): Promise<PlacePrediction[]> => {
    if (!input || input.length < 3) return [];
    if (!GOOGLE_API_KEY) {
        console.warn('Google Places API key not set. Set VITE_GOOGLE_PLACES_API_KEY in .env.local');
        return [];
    }

    try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
            },
            body: JSON.stringify({
                input,
                includedRegionCodes: ['tr'],
                languageCode: 'tr',
            }),
        });

        if (!res.ok) return [];

        const data = await res.json();
        const suggestions = data.suggestions || [];

        return suggestions
            .filter((s: { placePrediction?: unknown }) => s.placePrediction)
            .map((s: {
                placePrediction: {
                    placeId: string;
                    text: { text: string };
                    structuredFormat: {
                        mainText: { text: string };
                        secondaryText: { text: string };
                    };
                };
            }) => ({
                place_id: s.placePrediction.placeId,
                description: s.placePrediction.text?.text || '',
                structured_formatting: {
                    main_text: s.placePrediction.structuredFormat?.mainText?.text || '',
                    secondary_text: s.placePrediction.structuredFormat?.secondaryText?.text || '',
                },
            }));
    } catch {
        return [];
    }
};

/**
 * Get place details and convert to AddressDTO using Place Details REST API
 */
export const getPlaceDetails = async (placeId: string): Promise<Partial<AddressDTO> | null> => {
    if (!GOOGLE_API_KEY) return null;

    try {
        const fields = 'formattedAddress,location,addressComponents';
        const res = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}?languageCode=tr`,
            {
                headers: {
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                    'X-Goog-FieldMask': fields,
                },
            }
        );

        if (!res.ok) return null;

        const place = await res.json();

        const getComponent = (type: string): string => {
            const comp = (place.addressComponents || []).find(
                (c: { types: string[] }) => c.types?.includes(type)
            );
            return comp?.longText || comp?.shortText || '';
        };

        const address: Partial<AddressDTO> = {
            city: getComponent('administrative_area_level_1') || getComponent('locality'),
            district: getComponent('administrative_area_level_2') || getComponent('sublocality_level_1') || getComponent('sublocality'),
            country: getComponent('country'),
            street: `${getComponent('route')} ${getComponent('street_number')}`.trim() || place.formattedAddress || '',
            postalCode: getComponent('postal_code'),
            latitude: place.location?.latitude,
            longitude: place.location?.longitude,
            description: place.formattedAddress || '',
        };

        return address;
    } catch {
        return null;
    }
};

/**
 * Legacy export for backwards compatibility — no-op since we don't load scripts anymore
 */
export const loadGoogleMapsScript = (): Promise<void> => Promise.resolve();
