import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import { emailTemplateService, type EmailLogDetail } from '../../services/emailTemplateService';

/**
 * "Bu maile tam olarak ne gitti?" ekranı.
 *
 * Gövde veritabanında saklanmaz (bazı şablonlar geçici şifre taşıyor); kayıtlı
 * değişkenlerle sunucuda yeniden render edilir. Bu yüzden şablon gönderimden
 * sonra düzenlendiyse metin farklı olabilir — `renderNote` bunu söyler.
 */
export default function EmailLogDetailDialog({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EmailLogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    setError(null);
    emailTemplateService
      .logDetail(id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.response?.data?.message ?? e?.message ?? 'Kayıt açılamadı');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const links = detail?.html ? extractLinks(detail.html) : [];

  return (
    <Dialog open={!!id} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700} component="div">
          Gönderilen E-posta
        </Typography>
        {detail && (
          <Typography variant="body2" color="text.secondary">
            {detail.subject ?? '—'}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}

        {detail && (
          <Stack spacing={2.5}>
            <Table size="small">
              <TableBody>
                <Row label="Alıcı" value={detail.recipient} />
                <Row
                  label="Tarih"
                  value={new Date(detail.createdAt).toLocaleString('tr-TR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                />
                <Row label="Şablon" value={`${detail.templateTitle ?? '—'} (${detail.templateName ?? '—'})`} />
                <TableRow>
                  <TableCell sx={{ border: 0, color: 'text.secondary', width: 140, py: 0.5 }}>
                    Durum
                  </TableCell>
                  <TableCell sx={{ border: 0, py: 0.5 }}>
                    {detail.status === 'SENT' ? (
                      <Chip size="small" color="success" variant="outlined" label="Gönderildi" />
                    ) : (
                      <Chip size="small" color="error" label="Başarısız" />
                    )}
                    {detail.product && <Chip size="small" sx={{ ml: 0.5 }} label={detail.product} />}
                    {detail.category && (
                      <Chip size="small" variant="outlined" sx={{ ml: 0.5 }} label={detail.category} />
                    )}
                  </TableCell>
                </TableRow>
                {detail.errorMessage && (
                  <Row label="Hata" value={detail.errorMessage} />
                )}
              </TableBody>
            </Table>

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Gönderimde kullanılan bilgiler
              </Typography>
              {Object.keys(detail.variables ?? {}).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Bu kayıtta değişken saklanmamış.
                </Typography>
              ) : (
                <Table size="small">
                  <TableBody>
                    {Object.entries(detail.variables).map(([k, v]) => (
                      <TableRow key={k}>
                        <TableCell sx={{ color: 'text.secondary', width: 200, py: 0.5 }}>{k}</TableCell>
                        <TableCell sx={{ py: 0.5, wordBreak: 'break-word' }}>
                          {v === '***' ? (
                            <Chip size="small" variant="outlined" label="gizlendi (şifre/token)" />
                          ) : (
                            String(v ?? '—')
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {!!detail.placeholderVariables?.length && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Kayıtta olmadığı için örnek değerle gösterilen alanlar:{' '}
                  {detail.placeholderVariables.join(', ')}
                </Typography>
              )}
            </Box>

            {links.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  E-postadaki bağlantılar
                </Typography>
                <Stack spacing={0.5}>
                  {links.map((href) => (
                    <Link
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{ wordBreak: 'break-all' }}
                    >
                      {href}
                    </Link>
                  ))}
                </Stack>
              </Box>
            )}

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                E-posta gövdesi
              </Typography>
              {detail.renderNote && (
                <Alert severity={detail.variablesStored ? 'info' : 'warning'} sx={{ mb: 1.5 }}>
                  {detail.renderNote}
                </Alert>
              )}
              {detail.html ? (
                <Box
                  component="iframe"
                  title="E-posta önizleme"
                  srcDoc={detail.html}
                  sandbox=""
                  sx={{ width: '100%', height: 520, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Gövde gösterilemiyor.
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <TableRow>
      <TableCell sx={{ border: 0, color: 'text.secondary', width: 140, py: 0.5 }}>{label}</TableCell>
      <TableCell sx={{ border: 0, py: 0.5, wordBreak: 'break-word' }}>{value}</TableCell>
    </TableRow>
  );
}

/**
 * Gövdedeki http(s) bağlantılarını çıkarır. Mail linklerinin boş ya da yanlış
 * gitmesi geçmişte yaşanan bir sorundu; admin burada tıklayıp doğrulayabilsin.
 */
function extractLinks(html: string): string[] {
  const out = new Set<string>();
  const re = /href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.add(m[1].replace(/&amp;/g, '&'));
  }
  return Array.from(out);
}
