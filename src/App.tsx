import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { theme } from './theme/index';
import Layout from './components/Layout';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Devices = lazy(() => import('./pages/Devices'));
const Users = lazy(() => import('./pages/Users'));
const UserDetails = lazy(() => import('./pages/Users/UserDetails'));
const UserActivity = lazy(() => import('./pages/Users/UserActivity'));
const NartLiveUsers = lazy(() => import('./pages/NartLive/NartLiveUsers'));
const NbAuditLog = lazy(() => import('./pages/NartBusiness/NbAuditLog'));
const NbEmailLogs = lazy(() => import('./pages/NartBusiness/NbEmailLogs'));
const NbLoginLogs = lazy(() => import('./pages/NartBusiness/NbLoginLogs'));
const Login = lazy(() => import('./pages/Login'));
import PrivateRoute from './components/PrivateRoute';
import { useAuthStore } from './store/authStore';
import { normalizeRole } from './config/roles';
import { getLandingPath } from './config/workspaces';
const WorkspaceSelect = lazy(() => import('./pages/WorkspaceSelect'));
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
const Businesses = lazy(() => import('./pages/Businesses/Businesses'));
const BusinessDetails = lazy(() => import('./pages/Businesses/BusinessDetails'));
const BusinessCreate = lazy(() => import('./pages/Businesses/BusinessCreate'));
const BusinessClaims = lazy(() => import('./pages/Businesses/BusinessClaims'));
const BusinessCategories = lazy(() => import('./pages/BusinessCategories/BusinessCategories'));
const FeaturedStories = lazy(() => import('./pages/FeaturedStories/FeaturedStories'));
const UserCards = lazy(() => import('./pages/UserCards/UserCards'));
const FeatureFlags = lazy(() => import('./pages/FeatureFlags/FeatureFlags'));
const Events = lazy(() => import('./pages/Events/Events'));
const EventCategories = lazy(() => import('./pages/EventCategories/EventCategories'));
const AssociationDetails = lazy(() => import('./pages/Associations/AssociationDetails'));
const Associations = lazy(() => import('./pages/Associations/Associations'));
const AssociationCreatePage = lazy(() => import('./pages/Associations/AssociationCreatePage'));
const NotificationsRefactored = lazy(() => import('./pages/Notifications/NotificationsRefactored'));
const ManualEmailSender = lazy(() => import('./pages/ManualEmail/ManualEmailSender'));
const EmailLogs = lazy(() => import('./pages/ManualEmail/EmailLogs'));
const EmailTemplateEditor = lazy(() => import('./pages/ManualEmail/EmailTemplateEditor'));
const TicketCreationPage = lazy(() => import('./pages/Tickets/TicketCreationPage'));
const RaffleLivePage = lazy(() => import('./pages/Event/RaffleLivePage'));
const FeedVideos = lazy(() => import('./pages/Feeds/FeedVideos'));
const Bulletins = lazy(() => import('./pages/Bulletins/Bulletins'));
const ContentList = lazy(() => import('./pages/Content/ContentList'));
const ContentDetail = lazy(() => import('./pages/Content/ContentDetail'));
const ContentEditor = lazy(() => import('./pages/Content/ContentEditor'));
const ContentIngest = lazy(() => import('./pages/Content/ContentIngest'));
const GamificationSettings = lazy(() => import('./pages/Gamification/GamificationSettings'));
const RaffleCampaigns = lazy(() => import('./pages/Raffle/RaffleCampaigns'));
const SubMerchants = lazy(() => import('./pages/SubMerchants/SubMerchants'));
const SubMerchantForm = lazy(() => import('./pages/SubMerchants/SubMerchantForm'));
const SubMerchantDetails = lazy(() => import('./pages/SubMerchants/SubMerchantDetails'));
// NOT: EventDetail dosyası duplikasyon temizliği sonrası route'tan kaldırıldı (2026-04-20).
// /events/:id artık /event-console/:id'ye redirect ediliyor. Dosya gelecekte read-only preview için tutulur.
const SalesCommandCenter = lazy(() => import('./pages/SalesCommandCenter/SalesCommandCenter'));
const VenueInventoryManager = lazy(() => import('./pages/VenueInventoryManager/VenueInventoryManager'));
const BoxOffice = lazy(() => import('./pages/BoxOffice/BoxOffice'));
const SettlementFinance = lazy(() => import('./pages/SettlementFinance/SettlementFinance'));
const GateOpsLiveBoard = lazy(() => import('./pages/GateOpsLiveBoard/GateOpsLiveBoard'));
const CustomerSupportConsole = lazy(() => import('./pages/CustomerSupport/CustomerSupportConsole'));
const CampaignPromoEngine = lazy(() => import('./pages/CampaignPromoEngine/CampaignPromoEngine'));
const SeatMapLive = lazy(() => import('./pages/SeatMap/SeatMapLive'));
const NotificationCalendar = lazy(() => import('./pages/NotificationCalendar/NotificationCalendar'));
const EventConsole = lazy(() => import('./pages/EventConsole/EventConsole'));
const SeatTemplateList = lazy(() => import('./pages/SeatTemplates/SeatTemplateList'));
const SeatTemplateWizard = lazy(() => import('./pages/SeatTemplates/SeatTemplateWizard'));
const EventOperations = lazy(() => import('./pages/AdminOperations/EventOperations'));
const Settings = lazy(() => import('./pages/Settings'));
const AuditLog = lazy(() => import('./pages/AuditLog/AuditLog'));
const TicketManagement = lazy(() => import('./pages/Tickets/TicketManagement'));
const AnalyticsDashboard = lazy(() => import('./pages/Analytics/AnalyticsDashboard'));
const ExecutiveDashboard = lazy(() => import('./pages/Executive/ExecutiveDashboard'));
const FinanceOverview = lazy(() => import('./pages/FinanceOverview/FinanceOverview'));
const Reconciliation = lazy(() => import('./pages/Reconciliation/Reconciliation'));
const Payouts = lazy(() => import('./pages/Payouts/Payouts'));
const Refunds = lazy(() => import('./pages/Refunds/Refunds'));
const DeadLetterQueue = lazy(() => import('./pages/DeadLetterQueue/DeadLetterQueue'));
const JobMonitor = lazy(() => import('./pages/JobMonitor/JobMonitor'));
const Segments = lazy(() => import('./pages/Segments/Segments'));
const Cohorts = lazy(() => import('./pages/Cohorts/Cohorts'));
const FunnelAnalytics = lazy(() => import('./pages/FunnelAnalytics/FunnelAnalytics'));
const Coupons = lazy(() => import('./pages/Coupons/Coupons'));
const Referrals = lazy(() => import('./pages/Referrals/Referrals'));
const RbacMatrix = lazy(() => import('./pages/RbacMatrix/RbacMatrix'));
const ActiveSessions = lazy(() => import('./pages/ActiveSessions/ActiveSessions'));
const AnomalyDetector = lazy(() => import('./pages/AnomalyDetector/AnomalyDetector'));
const FraudDetection = lazy(() => import('./pages/FraudDetection/FraudDetection'));
const ChurnRisk = lazy(() => import('./pages/ChurnRisk/ChurnRisk'));
const User360 = lazy(() => import('./pages/User360/User360'));
const InactiveUsers = lazy(() => import('./pages/EngagementAnalytics/InactiveUsers'));
const LoginFrequency = lazy(() => import('./pages/EngagementAnalytics/LoginFrequency'));
const ProductAnalytics = lazy(() => import('./pages/EngagementAnalytics/ProductAnalytics'));
const NbDashboard = lazy(() => import('./pages/NartBusiness/NbDashboard'));
const NbDecisionBoard = lazy(() => import('./pages/NartBusiness/NbDecisionBoard'));
const NbMembers = lazy(() => import('./pages/NartBusiness/NbMembers'));
const NbMemberDetail = lazy(() => import('./pages/NartBusiness/NbMemberDetail'));
const NbVerificationQueue = lazy(() => import('./pages/NartBusiness/NbVerificationQueue'));
const NbVerificationPolicies = lazy(() => import('./pages/NartBusiness/NbVerificationPolicies'));
const NbPartnerOrgs = lazy(() => import('./pages/NartBusiness/NbPartnerOrgs'));
const NbSectors = lazy(() => import('./pages/NartBusiness/NbSectors'));
const NbJobTitles = lazy(() => import('./pages/NartBusiness/NbJobTitles'));
const NbTierManagement = lazy(() => import('./pages/NartBusiness/NbTierManagement'));
const NbValueChain = lazy(() => import('./pages/NartBusiness/NbValueChain'));
const NbEmbeddingJobs = lazy(() => import('./pages/NartBusiness/NbEmbeddingJobs'));
const NbModerationQueue = lazy(() => import('./pages/NartBusiness/NbModerationQueue'));
const NbIntroductions = lazy(() => import('./pages/NartBusiness/NbIntroductions'));
const NbTenders = lazy(() => import('./pages/NartBusiness/NbTenders'));
const NbTenderReferrals = lazy(() => import('./pages/NartBusiness/NbTenderReferrals'));
const NbDlqPanel = lazy(() => import('./pages/NartBusiness/NbDlqPanel'));
const NbShareAnalytics = lazy(() => import('./pages/NartBusiness/NbShareAnalytics'));
const NbTestimonials = lazy(() => import('./pages/NartBusiness/NbTestimonials'));
const NbMarketOpinions = lazy(() => import('./pages/NartBusiness/NbMarketOpinions'));
const NbMarketNews = lazy(() => import('./pages/NartBusiness/NbMarketNews'));
const NbJobModeration = lazy(() => import('./pages/NartBusiness/NbJobModeration'));
const NbListingModeration = lazy(() => import('./pages/NartBusiness/NbListingModeration'));
const NbListingReferrals = lazy(() => import('./pages/NartBusiness/NbListingReferrals'));
const NbReferralModeration = lazy(() => import('./pages/NartBusiness/NbReferralModeration'));
const NbQuestionModeration = lazy(() => import('./pages/NartBusiness/NbQuestionModeration'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const routerBasename =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SnackbarProvider maxSnack={3}>
          <CssBaseline />
          <BrowserRouter basename={routerBasename}>
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Yükleniyor...</div>}>
              <Routes>
              <Route path="/login" element={<Login />} />

              {/* Panel seçimi — Layout dışında, kendi tam ekran kabuğu var */}
              <Route path="/workspace" element={<PrivateRoute><WorkspaceSelect /></PrivateRoute>} />

              {/* EventConsole — tam ekran, kendi sidebar'ı var */}
              <Route path="/event-console/:eventId" element={<PrivateRoute><EventConsole /></PrivateRoute>} />

              {/* SeatMap standalone — Layout'suz, EventConsole iframe'inden çağrılır */}
              <Route path="/events/:eventId/seat-map/embed" element={<PrivateRoute><SeatMapLive /></PrivateRoute>} />

              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<RoleLanding />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="executive" element={<ExecutiveDashboard />} />
                <Route path="finance/overview" element={<FinanceOverview />} />
                <Route path="finance/reconciliation" element={<Reconciliation />} />
                <Route path="finance/payouts" element={<Payouts />} />
                <Route path="finance/refunds" element={<Refunds />} />
                <Route path="ops/dlq" element={<DeadLetterQueue />} />
                <Route path="ops/jobs" element={<JobMonitor />} />
                <Route path="growth/segments" element={<Segments />} />
                <Route path="growth/cohorts" element={<Cohorts />} />
                <Route path="growth/funnel" element={<FunnelAnalytics />} />
                <Route path="growth/coupons" element={<Coupons />} />
                <Route path="growth/referrals" element={<Referrals />} />
                <Route path="security/rbac" element={<RbacMatrix />} />
                <Route path="security/sessions" element={<ActiveSessions />} />
                <Route path="security/anomalies" element={<AnomalyDetector />} />
                <Route path="security/fraud" element={<FraudDetection />} />
                <Route path="growth/churn" element={<ChurnRisk />} />

                {/* Kullanıcı Etkileşimi */}
                <Route path="engagement/inactive-users" element={<InactiveUsers />} />
                <Route path="engagement/login-frequency" element={<LoginFrequency />} />
                <Route path="engagement/product-analytics" element={<ProductAnalytics />} />

                <Route path="devices" element={<Devices />} />
                <Route path="notifications" element={<NotificationsRefactored />} />
                <Route path="manual-email" element={<ManualEmailSender />} />
                <Route path="email-templates" element={<EmailTemplateEditor />} />
                <Route path="email-logs" element={<EmailLogs />} />
                <Route path="feeds" element={<FeedVideos />} />
                <Route path="bulletins" element={<Bulletins />} />
                <Route path="content" element={<ContentList />} />
                <Route path="content/ingest" element={<ContentIngest />} />
                <Route path="content/new" element={<ContentEditor />} />
                <Route path="content/:id" element={<ContentDetail />} />
                <Route path="content/:id/edit" element={<ContentEditor />} />
                <Route path="users" element={<Users />} />
                <Route path="user-activity" element={<UserActivity />} />
                <Route path="nartlive/users" element={<NartLiveUsers />} />
                <Route path="users/:id" element={<UserDetails />} />
                <Route path="users/:id/360" element={<User360 />} />
                <Route path="businesses" element={<Businesses />} />
                <Route path="businesses/new" element={<BusinessCreate />} />
                <Route path="businesses/:id" element={<BusinessDetails />} />
                <Route path="business-claims" element={<BusinessClaims />} />
                <Route path="business-categories" element={<BusinessCategories />} />
                <Route path="featured-stories" element={<FeaturedStories />} />
                <Route path="user-cards" element={<UserCards />} />
                <Route path="feature-flags" element={<FeatureFlags />} />
                <Route path="events" element={<Events />} />
                <Route path="events/:id" element={<EventDetailRedirect />} />
                <Route path="sales-command" element={<SalesCommandCenter />} />
                <Route path="venue-inventory" element={<VenueInventoryManager />} />
                <Route path="box-office" element={<BoxOffice />} />
                <Route path="settlement-finance" element={<SettlementFinance />} />
                <Route path="gate-ops" element={<GateOpsLiveBoard />} />
                <Route path="customer-support" element={<CustomerSupportConsole />} />
                <Route path="campaign-engine" element={<CampaignPromoEngine />} />
                <Route path="associations" element={<Associations />} />
                <Route path="associations/new" element={<AssociationCreatePage />} />
                <Route path="event-operations" element={<EventOperations />} />
                <Route path="event-operations/:eventId" element={<EventOperations />} />
                <Route path="event-categories" element={<EventCategories />} />
                <Route path="event/raffle-live" element={<RaffleLivePage />} />
                <Route path="event-creation" element={<TicketCreationPage />} />
                <Route path="event-creation/:eventId" element={<TicketCreationPage />} />
                <Route path="tickets" element={<TicketManagement />} />
                <Route path="notification-calendar" element={<NotificationCalendar />} />
                <Route path="seat-templates" element={<SeatTemplateList />} />
                <Route path="seat-templates/new" element={<SeatTemplateWizard />} />
                <Route path="events/:eventId/seat-map" element={<SeatMapLive />} />
                <Route path="associations/:associationId/:ownerId" element={<AssociationDetails />} />
                <Route path="gamification" element={<GamificationSettings />} />
                <Route path="raffle" element={<RaffleCampaigns />} />
                <Route path="sub-merchants" element={<SubMerchants />} />
                <Route path="sub-merchants/new" element={<SubMerchantForm />} />
                <Route path="sub-merchants/:id" element={<SubMerchantDetails />} />
                <Route path="settings" element={<Settings />} />
                <Route path="audit-log" element={<AuditLog />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                {/* NartBusiness (Sprint 7) */}
                <Route path="nartbusiness/dashboard" element={<NbDashboard />} />
                <Route path="nartbusiness/decision-board" element={<NbDecisionBoard />} />
                <Route path="nartbusiness/audit" element={<NbAuditLog />} />
                <Route path="nartbusiness/email-logs" element={<NbEmailLogs />} />
                <Route path="nartbusiness/login-logs" element={<NbLoginLogs />} />
                <Route path="nartbusiness/members" element={<NbMembers />} />
                <Route
                  path="nartbusiness/members/:memberId"
                  element={<NbMemberDetail />}
                />
                <Route path="nartbusiness/verification" element={<NbVerificationQueue />} />
                <Route path="nartbusiness/verification-policies" element={<NbVerificationPolicies />} />
                <Route path="nartbusiness/sectors" element={<NbSectors />} />
                <Route path="nartbusiness/partner-orgs" element={<NbPartnerOrgs />} />
                <Route path="nartbusiness/job-titles" element={<NbJobTitles />} />
                <Route path="nartbusiness/tiers" element={<NbTierManagement />} />
                <Route path="nartbusiness/value-chain" element={<NbValueChain />} />
                <Route path="nartbusiness/embedding-jobs" element={<NbEmbeddingJobs />} />
                <Route path="nartbusiness/moderation" element={<NbModerationQueue />} />
                <Route path="nartbusiness/introductions" element={<NbIntroductions />} />
                <Route path="nartbusiness/tenders" element={<NbTenders />} />
                <Route path="nartbusiness/tender-referrals" element={<NbTenderReferrals />} />
                <Route path="nartbusiness/dlq" element={<NbDlqPanel />} />
                <Route path="nartbusiness/share-analytics" element={<NbShareAnalytics />} />
                <Route path="nartbusiness/testimonials" element={<NbTestimonials />} />
                <Route path="nartbusiness/market-opinions" element={<NbMarketOpinions />} />
                <Route path="nartbusiness/market-news" element={<NbMarketNews />} />
                <Route path="nartbusiness/jobs" element={<NbJobModeration />} />
                <Route path="nartbusiness/listings" element={<NbListingModeration />} />
                <Route path="nartbusiness/listing-referrals" element={<NbListingReferrals />} />
                <Route path="nartbusiness/referrals" element={<NbReferralModeration />} />
                <Route path="nartbusiness/questions" element={<NbQuestionModeration />} />
              </Route>

              {/* Bilinmeyen path → rol-bilinçli landing (boş ekran yerine). */}
              <Route path="*" element={<RoleLanding />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Eski /events/:id URL'ini koruma amaçlı redirect.
// Tek doğruluk kaynağı EventConsole; bookmark/external link'ler kırılmasın diye.
function EventDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/events" replace />;
  return <Navigate to={`/event-console/${id}`} replace />;
}

/**
 * Rol-bilinçli landing — index ("/") ve catch-all ("*") için. Kullanıcının
 * rolüne göre erişebileceği varsayılan sayfaya yönlendirir (NB-only kullanıcı
 * /dashboard yerine /nartbusiness/dashboard'a iner). İki panele de yetkisi
 * olan önce /workspace'te seçim yapar. Oturum yoksa /login'e.
 */
function RoleLanding() {
  const user = useAuthStore((s) => s.user);
  const roles: string[] = [];
  const r = user?.role as unknown;
  if (r instanceof Set) r.forEach((x) => roles.push(normalizeRole(String(x))));
  else if (Array.isArray(r)) r.forEach((x) => roles.push(normalizeRole(String(x))));
  else if (typeof r === 'string') roles.push(normalizeRole(r));

  if (roles.length === 0) return <Navigate to="/login" replace />;
  return <Navigate to={getLandingPath(roles)} replace />;
}

export default App;
