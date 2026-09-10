import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import {
  AutoStories as ArticlesIcon,
  CardMembership as CardIcon,
  ConfirmationNumber as TicketIcon,
  Diversity3 as ReferralIcon,
  EmojiEvents as StaffIcon,
  Star as FeaturedIcon,
  Person as MyStoryIcon,
  Group as UserFeedIcon,
  Business as NbBusinessIcon,
} from '@mui/icons-material';
import {
  FeatureFlag,
  FeatureFlagService,
} from '../../services/featureFlag/featureFlagService';

/**
 * Curated list of every story-header widget the mobile app respects.
 * Source of truth lives in `story_feed_widget.dart` — keep this in sync
 * when adding/removing entries on the mobile side.
 *
 * Each item is rendered as a switchable card regardless of whether the
 * backend row exists yet. If a key isn't in the DB the panel still shows
 * it as "default-on" (matching mobile behaviour) and creates the row on
 * first toggle so admins never see a "missing" widget.
 */
type KnownStoryFlag = {
  flagKey: string;
  label: string;
  description: string;
  Icon: typeof TicketIcon;
};

const KNOWN_STORY_FLAGS: KnownStoryFlag[] = [
  {
    flagKey: 'story.tickets.enabled',
    label: 'Aktif Biletler',
    description:
      'Kullanıcının yaklaşan etkinliklerine ait bilet kartları (geri sayım dahil).',
    Icon: TicketIcon,
  },
  {
    flagKey: 'story.my_story.enabled',
    label: 'Senin Hikayen',
    description:
      'Kullanıcının kendi hikayesini yükleme ve görüntüleme girişi (artı ikonu).',
    Icon: MyStoryIcon,
  },
  {
    flagKey: 'story.my_card.enabled',
    label: 'Kartım (NartGo Kart)',
    description:
      'Kullanıcının kişisel NartGo üyelik kartını açan giriş — indirim QR taraması için.',
    Icon: CardIcon,
  },
  {
    flagKey: 'story.nb_business.enabled',
    label: 'NartBusiness',
    description:
      'NartBusiness giriş kartı. Kullanıcının rolü/üyeliği yoksa mobil tarafta zaten gizlenir; bu anahtar kartı tümden kapatır.',
    Icon: NbBusinessIcon,
  },
  {
    flagKey: 'story.referral.enabled',
    label: 'Davet Et',
    description:
      'Kullanıcıyı arkadaşlarını referans koduyla davet etmeye yönlendiren CTA.',
    Icon: ReferralIcon,
  },
  {
    flagKey: 'story.staff.enabled',
    label: 'Görev (Staff)',
    description:
      'Etkinlik check-in görevlisi olarak atanmış kullanıcılar için görev kartı.',
    Icon: StaffIcon,
  },
  {
    flagKey: 'story.articles.enabled',
    label: 'Makale / Blog',
    description:
      'Öne çıkan makale/blog girişlerini hikaye şeridinde gösterir.',
    Icon: ArticlesIcon,
  },
  {
    flagKey: 'story.featured_business.enabled',
    label: 'Öne Çıkan',
    description:
      'Admin tarafından seçilen günlük içerik (işletme/etkinlik/reel/blog).',
    Icon: FeaturedIcon,
  },
  {
    flagKey: 'story.user_feed.enabled',
    label: 'Takip Edilen Hikayeleri',
    description: 'Kullanıcının takip ettiği kişilerin aktif hikayeleri.',
    Icon: UserFeedIcon,
  },
];

interface Props {
  flags: FeatureFlag[];
  onChange: (flag: FeatureFlag) => void;
  onError: (message: string) => void;
}

const service = FeatureFlagService.getInstance();

const StoryVisibilityPanel = ({ flags, onChange, onError }: Props) => {
  const findFlag = (key: string) => flags.find((f) => f.flagKey === key);

  const handleToggle = async (
    known: KnownStoryFlag,
    nextEnabled: boolean,
  ) => {
    const existing = findFlag(known.flagKey);
    try {
      if (existing) {
        const updated = await service.toggle(existing.id, nextEnabled);
        onChange(updated);
      } else {
        // Backend row not seeded yet — create it on first toggle so the
        // admin doesn't have to leave the page to add it manually.
        const created = await service.create({
          flagKey: known.flagKey,
          enabled: nextEnabled,
          description: known.description,
          category: 'story',
        });
        onChange(created);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Görünürlük güncellenemedi');
    }
  };

  return (
    <Box mb={4}>
      <Stack direction="row" alignItems="baseline" spacing={1.5} mb={1.5}>
        <Typography variant="h6" fontWeight={700}>
          Hikaye Şeridi Widget'ları
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ana sayfa üst şeridindeki kartları aç/kapat
        </Typography>
      </Stack>

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        }}
        gap={2}
      >
        {KNOWN_STORY_FLAGS.map((known) => {
          const flag = findFlag(known.flagKey);
          // Mobile defaults missing keys to enabled, so we mirror that here
          // for visual consistency until the row is created.
          const isVisible = flag ? flag.enabled : true;
          const Icon = known.Icon;
          return (
            <Card
              key={known.flagKey}
              variant="outlined"
              sx={{
                position: 'relative',
                borderColor: isVisible ? 'success.main' : 'divider',
                opacity: isVisible ? 1 : 0.7,
                transition: 'all 0.2s',
              }}
            >
              <CardContent sx={{ pb: '16px !important' }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      bgcolor: isVisible ? 'success.light' : 'action.disabledBackground',
                      color: isVisible ? 'success.dark' : 'text.disabled',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography fontWeight={600} fontSize={14} noWrap>
                        {known.label}
                      </Typography>
                      <Switch
                        size="small"
                        checked={isVisible}
                        onChange={(e) => handleToggle(known, e.target.checked)}
                      />
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4,
                        mt: 0.25,
                      }}
                    >
                      {known.description}
                    </Typography>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={0.75}
                      mt={0.75}
                    >
                      <Chip
                        size="small"
                        label={isVisible ? 'Görünür' : 'Gizli'}
                        color={isVisible ? 'success' : 'default'}
                        sx={{ height: 18, fontSize: 10 }}
                      />
                      {!flag && (
                        <Typography
                          fontSize={10}
                          color="text.secondary"
                          fontStyle="italic"
                        >
                          (henüz kaydedilmemiş — varsayılan açık)
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default StoryVisibilityPanel;
