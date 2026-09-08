/**
 * NartBusiness workspace navigasyonu.
 *
 * Eskiden bu 22 öğe, NartGo'nun kenar çubuğunda "NartBusiness" başlıklı tek
 * bir bölümde düz liste hâlindeydi — paneldeki en uzun bölümdü ve içindeki
 * hiçbir şey birbirinden ayrışmıyordu. Sekiz farklı sayfa aynı FactCheck
 * ikonunu paylaşıyordu, yani ikon da bir ayırt edici değildi.
 *
 * Burada aynı öğeler altı işlevsel alana bölündü: üyelik yaşam döngüsü,
 * topluluk moderasyonu, ticaret akışları, katalog bakımı ve sistem. Rol
 * filtreleri birebir korundu; değişen yalnızca gruplama ve ikonografi.
 */

import {
    SpaceDashboard as NbDashboardIcon,
    People as MembersIcon,
    VerifiedUser as VerificationIcon,
    Policy as PolicyIcon,
    WorkspacePremium as TierIcon,
    FactCheck as ModerationIcon,
    Forum as OpinionsIcon,
    QuestionAnswer as QuestionsIcon,
    Newspaper as NewsIcon,
    FormatQuote as TestimonialIcon,
    Storefront as ListingIcon,
    Gavel as TenderIcon,
    WorkOutline as JobIcon,
    Handshake as IntroductionIcon,
    AltRoute as ReferralIcon,
    Category as SectorIcon,
    Badge as JobTitleIcon,
    AccountTree as ValueChainIcon,
    Share as ShareIcon,
    Hub as EmbeddingIcon,
    ManageSearch as AuditIcon,
    Email as EmailIcon,
    ReportProblem as DlqIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import type { NavSection } from './types';

/** Yönetim rolleri — komite üyesi bu sayfaları görmez. */
const NB_MANAGE = ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN'];
/** Moderasyon rolleri — komite üyesi dahil. */
const NB_MODERATE = ['ADMIN', 'NB_ADMIN', 'NB_CO_ADMIN', 'NB_COMMITTEE'];

export const nartbusinessNavSections: NavSection[] = [
    {
        title: 'Genel',
        items: [
            { text: 'Kontrol Paneli', icon: <NbDashboardIcon />, path: '/nartbusiness/dashboard' },
        ],
    },
    {
        title: 'Üyelik',
        items: [
            { text: 'Üyeler', icon: <MembersIcon />, path: '/nartbusiness/members' },
            { text: 'Doğrulama Kuyruğu', icon: <VerificationIcon />, path: '/nartbusiness/verification' },
            { text: 'Belge Politikaları', icon: <PolicyIcon />, path: '/nartbusiness/verification-policies', allowedRoles: NB_MANAGE },
            { text: 'Üyelik Tipleri', icon: <TierIcon />, path: '/nartbusiness/tiers', allowedRoles: NB_MANAGE },
        ],
    },
    {
        title: 'Topluluk Moderasyonu',
        items: [
            { text: 'Moderasyon Kuyruğu', icon: <ModerationIcon />, path: '/nartbusiness/moderation', allowedRoles: NB_MODERATE },
            { text: 'Üye Görüşleri', icon: <OpinionsIcon />, path: '/nartbusiness/market-opinions', allowedRoles: NB_MODERATE },
            { text: 'Topluluk Soruları', icon: <QuestionsIcon />, path: '/nartbusiness/questions', allowedRoles: NB_MODERATE },
            { text: 'Piyasa Haberleri', icon: <NewsIcon />, path: '/nartbusiness/market-news', allowedRoles: NB_MODERATE },
            { text: 'Referanslar', icon: <TestimonialIcon />, path: '/nartbusiness/testimonials', allowedRoles: NB_MANAGE },
        ],
    },
    {
        title: 'Ticaret & Fırsatlar',
        items: [
            { text: 'İlanlar (Talep/Arz)', icon: <ListingIcon />, path: '/nartbusiness/listings', allowedRoles: NB_MODERATE },
            { text: 'İhaleler', icon: <TenderIcon />, path: '/nartbusiness/tenders', allowedRoles: NB_MANAGE },
            { text: 'Pozisyon İlanları', icon: <JobIcon />, path: '/nartbusiness/jobs', allowedRoles: NB_MODERATE },
            { text: 'Tanıştırmalar', icon: <IntroductionIcon />, path: '/nartbusiness/introductions', allowedRoles: NB_MANAGE },
            { text: 'Yönlendirmeler', icon: <ReferralIcon />, path: '/nartbusiness/referrals', allowedRoles: NB_MODERATE },
        ],
    },
    {
        title: 'Katalog',
        allowedRoles: NB_MANAGE,
        items: [
            { text: 'Sektör Katalogu', icon: <SectorIcon />, path: '/nartbusiness/sectors' },
            { text: 'Ünvan Katalogu', icon: <JobTitleIcon />, path: '/nartbusiness/job-titles' },
            { text: 'Sektör Değer Zinciri', icon: <ValueChainIcon />, path: '/nartbusiness/value-chain' },
        ],
    },
    {
        // Bölüm seviyesinde kısıt yok: "Ayarlar" her role açık olmalı,
        // kısıt tek tek analitik/sistem öğelerinde.
        title: 'Analitik & Sistem',
        items: [
            { text: 'Paylaşım Analitikleri', icon: <ShareIcon />, path: '/nartbusiness/share-analytics', allowedRoles: NB_MANAGE },
            { text: 'Embedding & Matching', icon: <EmbeddingIcon />, path: '/nartbusiness/embedding-jobs', allowedRoles: NB_MANAGE },
            { text: 'İşlem Kayıtları', icon: <AuditIcon />, path: '/nartbusiness/audit', allowedRoles: NB_MANAGE },
            { text: 'E-posta Kayıtları', icon: <EmailIcon />, path: '/nartbusiness/email-logs', allowedRoles: NB_MANAGE },
            { text: 'Başarısız Mesajlar', icon: <DlqIcon />, path: '/nartbusiness/dlq', allowedRoles: NB_MANAGE },
            { text: 'Ayarlar', icon: <SettingsIcon />, path: '/settings' },
        ],
    },
];
