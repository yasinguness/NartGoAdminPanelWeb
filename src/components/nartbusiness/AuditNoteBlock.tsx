import type { ReactNode } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

/**
 * Kategorize + serbest-metin audit notu — KVKK / SOX uyumlu admin müdahaleleri için
 * standart bileşen. Final string: `[KATEGORI: <CATEGORY>] <BODY>` — backend tek alanda
 * saklar, kategori sonradan log search'te grep'lenebilir.
 */

export interface AuditCategoryOption {
  value: string;
  label: string;
}

interface Props {
  /** Audit kategori seçenekleri — context'e göre değişir (üye ekleme vs verification). */
  categories: AuditCategoryOption[];
  category: string;
  onCategoryChange: (v: string) => void;
  note: string;
  onNoteChange: (v: string) => void;
  /** Minimum karakter — default 30. Boş not gönderimini engeller. */
  minChars?: number;
  maxChars?: number;
  /** Üst başlık (örn. "Audit Notu" — opsiyonel). */
  title?: ReactNode;
  placeholder?: string;
  helperHint?: ReactNode;
  disabled?: boolean;
  /** Backend'e gönderilecek format. Caller dışarıdan değiştiremez ama yardımcı export. */
}

const DEFAULT_MIN = 30;
const DEFAULT_MAX = 1000;

export default function AuditNoteBlock({
  categories,
  category,
  onCategoryChange,
  note,
  onNoteChange,
  minChars = DEFAULT_MIN,
  maxChars = DEFAULT_MAX,
  title,
  placeholder,
  helperHint,
  disabled,
}: Props) {
  const trimmed = note.trim();
  const valid = trimmed.length >= minChars;
  const showError = note.length > 0 && !valid;

  return (
    <Stack spacing={1.5}>
      {title}
      <FormControl size="small" fullWidth disabled={disabled}>
        <InputLabel>Audit Kategorisi *</InputLabel>
        <Select
          label="Audit Kategorisi *"
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          {categories.map((c) => (
            <MenuItem key={c.value} value={c.value}>
              {c.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Audit Notu *"
        fullWidth
        size="small"
        multiline
        minRows={3}
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={placeholder}
        error={showError}
        disabled={disabled}
        inputProps={{ maxLength: maxChars }}
        helperText={
          <Box
            component="span"
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
          >
            <Typography
              component="span"
              variant="caption"
              sx={{ color: 'text.secondary', flex: 1 }}
            >
              {helperHint ??
                "Audit log'a kalıcı yazılır — üye veya hukuk ekibi geriye dönük inceleyebilir."}
            </Typography>
            <Typography
              component="span"
              variant="caption"
              sx={{
                color: valid ? 'success.main' : 'error.main',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {valid
                ? `${trimmed.length} / ${maxChars} ✓`
                : `${trimmed.length} / ${minChars} min`}
            </Typography>
          </Box>
        }
      />
      {!valid && (
        <LinearProgress
          variant="determinate"
          value={Math.min((trimmed.length / minChars) * 100, 100)}
          color={trimmed.length === 0 ? 'inherit' : 'warning'}
          sx={{ height: 3, borderRadius: 1, mt: -0.5 }}
        />
      )}
    </Stack>
  );
}

/**
 * Gönderilecek `adminNote` string'ini standart formata getirir.
 * Boş notta boş döner — caller submit'i bloklamalı.
 */
export function buildAuditNote(category: string, body: string): string {
  const t = body.trim();
  if (!t) return '';
  return `[KATEGORI: ${category}] ${t}`;
}

/**
 * Caller tarafında validation'da kullanmak için.
 */
export function isAuditNoteValid(body: string, minChars: number = DEFAULT_MIN): boolean {
  return body.trim().length >= minChars;
}
