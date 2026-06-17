import { useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material/styles';

/**
 * NB ekranları için ortak "dar ekran mı?" kontrolü. Dialog'ları mobilde
 * fullScreen yapmak ve responsive davranış için tek kaynak.
 */
export function useNbMobile(): boolean {
  return useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
}
