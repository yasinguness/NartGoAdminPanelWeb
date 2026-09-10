import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Pagination,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';

import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { ErrorState, LoadingState } from '../../components/Feedback';
import { UserCardService } from '../../services/userCard/userCardService';
import { UserCardDto } from '../../types/userCard/userCardModel';

const cardService = UserCardService.getInstance();

const formatDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
};

export default function UserCards() {
  const { enqueueSnackbar } = useSnackbar();

  const [cards, setCards] = useState<UserCardDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // zero-based
  const [size] = useState(20);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cardService.list(search, page, size);
      setCards(data.content || []);
      setTotal(data.totalElements || 0);
    } catch (err: any) {
      setError(err?.message || 'Kartlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const applySearch = () => {
    setSearch(searchDraft.trim() || undefined);
    setPage(0);
  };

  const toggleVisibility = async (card: UserCardDto) => {
    setPendingId(card.userEmail);
    try {
      const updated = await cardService.setVisibility(card.userEmail, !card.mobileVisible);
      setCards((prev) => prev.map((c) => (c.userEmail === updated.userEmail ? updated : c)));
      enqueueSnackbar(
        updated.mobileVisible ? 'Kart artık mobilde görünür' : 'Kart mobilde gizlendi',
        { variant: 'success' },
      );
    } catch {
      enqueueSnackbar('Görünürlük güncellenemedi', { variant: 'error' });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Üye Kartları"
        subtitle="Kullanıcıların kişisel NartGo kartları — mobil görünürlüklerini yönetin"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Üye Kartları', active: true },
        ]}
        actions={
          <Button variant="outlined" onClick={load} disabled={loading}>
            Yenile
          </Button>
        }
      />

      <PageSection>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems={{ md: 'center' }}>
          <TextField
            label="E-posta, isim veya kart numarası"
            size="small"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            sx={{ minWidth: 320 }}
          />
          <Button variant="contained" onClick={applySearch}>
            Filtrele
          </Button>
          {search && (
            <Button
              color="inherit"
              onClick={() => {
                setSearchDraft('');
                setSearch(undefined);
                setPage(0);
              }}
            >
              Temizle
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {total} kart
          </Typography>
        </Stack>

        {loading && cards.length === 0 ? (
          <LoadingState message="Kartlar yükleniyor..." />
        ) : error ? (
          <ErrorState title="Kartlar alınamadı" message={error} onRetry={load} />
        ) : cards.length === 0 ? (
          <Box textAlign="center" py={5}>
            <Typography color="text.secondary">Bu filtrelerle kart bulunamadı.</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Kullanıcı</TableCell>
                    <TableCell>Kart Numarası</TableCell>
                    <TableCell>Oluşturulma</TableCell>
                    <TableCell align="center">Mobilde Görünür</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.userEmail} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar src={card.profileImageUrl || undefined} sx={{ width: 36, height: 36 }}>
                            {(card.displayName?.[0] || card.userEmail[0]).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography fontWeight={600}>{card.displayName || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {card.userEmail}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={card.cardNumber} size="small" sx={{ fontFamily: 'monospace' }} />
                      </TableCell>
                      <TableCell>{formatDate(card.createdAt)}</TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={card.mobileVisible}
                          disabled={pendingId === card.userEmail}
                          onChange={() => toggleVisibility(card)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" justifyContent="center" mt={3}>
              <Pagination
                page={page + 1}
                count={Math.max(1, Math.ceil(total / size))}
                onChange={(_, p) => setPage(p - 1)}
                color="primary"
              />
            </Stack>
          </>
        )}
      </PageSection>
    </PageContainer>
  );
}
