/**
 * NartBusiness MUI teması.
 *
 * nbBrand.ts lacivert-altın kimliği zaten tanımlıyordu ama kimse okumuyordu:
 * dosyanın kendi notuna göre bu kimlik "yalnız bir modalın içinde yaşıyor,
 * dışarı çıkınca yeşile dönüyordu". Panelde NB workspace'i artık baştan sona
 * bu temayı kullanır, dolayısıyla kimlik tek bir diyalogda değil kabuğun
 * tamamında geçerli.
 *
 * Taban tema ile aynı tipografi, aynı yuvarlaklık, aynı komponent
 * varsayılanları kullanılır — ayrışan tek şey renktir. İki workspace farklı
 * görünmeli ama aynı elden çıkmış hissettirmeli.
 */

import { createTheme } from '@mui/material/styles';
import { muiPalette, neutral, text as textTokens } from './palette';
import { muiTypography } from './typography';
import { borderRadius } from './spacing';
import { muiComponents } from './components';
import { nb } from './nbBrand';

export const nbTheme = createTheme({
    palette: {
        ...muiPalette,
        primary: {
            main: nb.navy,
            light: nb.navySoft,
            dark: nb.navyDeep,
            contrastText: neutral.white,
        },
        secondary: {
            main: nb.gold,
            light: nb.goldSoft,
            dark: '#8C6508',
            contrastText: neutral.white,
        },
        background: {
            // Lacivert metne kaçan çok hafif soğuk bir zemin: NartGo'nun
            // nötr grisiyle yan yana konduğunda fark ediliyor, tek başına
            // bakıldığında dikkat dağıtmıyor.
            default: '#F5F6FA',
            paper: neutral.surface,
        },
        text: {
            primary: nb.navy,
            secondary: textTokens.secondary,
        },
    },
    typography: muiTypography,
    shape: {
        borderRadius: borderRadius.md,
    },
    components: muiComponents,
});
