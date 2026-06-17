import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { theme } from './theme/index';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Users from './pages/Users';
import UserDetails from './pages/Users/UserDetails';
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute';
import { useAuthStore } from './store/authStore';
import { getDefaultPath, normalizeRole } from './config/roles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Businesses from './pages/Businesses/Businesses';
import BusinessDetails from './pages/Businesses/BusinessDetails';
import BusinessCreate from './pages/Businesses/BusinessCreate';
import BusinessClaims from './pages/Businesses/BusinessClaims';
import BusinessCategories from './pages/BusinessCategories/BusinessCategories';
import FeaturedStories from './pages/FeaturedStories/FeaturedStories';
import UserCards from './pages/UserCards/UserCards';
import FeatureFlags from './pages/FeatureFlags/FeatureFlags';
import Events from './pages/Events/Events';
import EventCategories from './pages/EventCategories/EventCategories';
import AssociationDetails from './pages/Associations/AssociationDetails';
import Associations from './pages/Associations/Associations';
import AssociationCreatePage from './pages/Associations/AssociationCreatePage';
import NotificationsRefactored from './pages/Notifications/NotificationsRefactored';
import ManualEmailSender from './pages/ManualEmail/ManualEmailSender';
import EmailLogs from './pages/ManualEmail/EmailLogs';
import TicketCreationPage from './pages/Tickets/TicketCreationPage';
import RaffleLivePage from './pages/Event/RaffleLivePage';
import FeedVideos from './pages/Feeds/FeedVideos';
import Bulletins from './pages/Bulletins/Bulletins';
import ContentList from './pages/Content/ContentList';
import ContentDetail from './pages/Content/ContentDetail';
import ContentEditor from './pages/Content/ContentEditor';
import GamificationSettings from './pages/Gamification/GamificationSettings';
import SubMerchants from './pages/SubMerchants/SubMerchants';
import SubMerchantForm from './pages/SubMerchants/SubMerchantForm';
import SubMerchantDetails from './pages/SubMerchants/SubMerchantDetails';
// NOT: EventDetail dosyası duplikasyon temizliği sonrası route'tan kaldırıldı (2026-04-20).
// /events/:id artık /event-console/:id'ye redirect ediliyor. Dosya gelecekte read-only preview için tutulur.
import SalesCommandCenter from './pages/SalesCommandCenter/SalesCommandCenter';
import VenueInventoryManager from './pages/VenueInventoryManager/VenueInventoryManager';
import BoxOffice from './pages/BoxOffice/BoxOffice';
import SettlementFinance from './pages/SettlementFinance/SettlementFinance';
import GateOpsLiveBoard from './pages/GateOpsLiveBoard/GateOpsLiveBoard';
import CustomerSupportConsole from './pages/CustomerSupport/CustomerSupportConsole';
import CampaignPromoEngine from './pages/CampaignPromoEngine/CampaignPromoEngine';
import SeatMapLive from './pages/SeatMap/SeatMapLive';
import NotificationCalendar from './pages/NotificationCalendar/NotificationCalendar';
import EventConsole from './pages/EventConsole/EventConsole';
import SeatTemplateList from './pages/SeatTemplates/SeatTemplateList';
import SeatTemplateWizard from './pages/SeatTemplates/SeatTemplateWizard';
import EventOperations from './pages/AdminOperations/EventOperations';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog/AuditLog';
import TicketManagement from './pages/Tickets/TicketManagement';
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard';
import ExecutiveDashboard from './pages/Executive/ExecutiveDashboard';
import FinanceOverview from './pages/FinanceOverview/FinanceOverview';
import Reconciliation from './pages/Reconciliation/Reconciliation';
import Payouts from './pages/Payouts/Payouts';
import Refunds from './pages/Refunds/Refunds';
import DeadLetterQueue from './pages/DeadLetterQueue/DeadLetterQueue';
import JobMonitor from './pages/JobMonitor/JobMonitor';
import Segments from './pages/Segments/Segments';
import Cohorts from './pages/Cohorts/Cohorts';
import FunnelAnalytics from './pages/FunnelAnalytics/FunnelAnalytics';
import Coupons from './pages/Coupons/Coupons';
import Referrals from './pages/Referrals/Referrals';
import RbacMatrix from './pages/RbacMatrix/RbacMatrix';
import ActiveSessions from './pages/ActiveSessions/ActiveSessions';
import AnomalyDetector from './pages/AnomalyDetector/AnomalyDetector';
import FraudDetection from './pages/FraudDetection/FraudDetection';
import ChurnRisk from './pages/ChurnRisk/ChurnRisk';
import User360 from './pages/User360/User360';
import InactiveUsers from './pages/EngagementAnalytics/InactiveUsers';
import LoginFrequency from './pages/EngagementAnalytics/LoginFrequency';
import ProductAnalytics from './pages/EngagementAnalytics/ProductAnalytics';
import NbDashboard from './pages/NartBusiness/NbDashboard';
import NbMembers from './pages/NartBusiness/NbMembers';
import NbMemberDetail from './pages/NartBusiness/NbMemberDetail';
import NbVerificationQueue from './pages/NartBusiness/NbVerificationQueue';
import NbVerificationPolicies from './pages/NartBusiness/NbVerificationPolicies';
import NbSectors from './pages/NartBusiness/NbSectors';
import NbTierManagement from './pages/NartBusiness/NbTierManagement';
import NbValueChain from './pages/NartBusiness/NbValueChain';
import NbEmbeddingJobs from './pages/NartBusiness/NbEmbeddingJobs';
import NbModerationQueue from './pages/NartBusiness/NbModerationQueue';
import NbDlqPanel from './pages/NartBusiness/NbDlqPanel';
import NbShareAnalytics from './pages/NartBusiness/NbShareAnalytics';
import NbTestimonials from './pages/NartBusiness/NbTestimonials';
import NbMarketOpinions from './pages/NartBusiness/NbMarketOpinions';

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
            <Routes>
              <Route path="/login" element={<Login />} />

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
                <Route path="email-logs" element={<EmailLogs />} />
                <Route path="feeds" element={<FeedVideos />} />
                <Route path="bulletins" element={<Bulletins />} />
                <Route path="content" element={<ContentList />} />
                <Route path="content/new" element={<ContentEditor />} />
                <Route path="content/:id" element={<ContentDetail />} />
                <Route path="content/:id/edit" element={<ContentEditor />} />
                <Route path="users" element={<Users />} />
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
                <Route path="sub-merchants" element={<SubMerchants />} />
                <Route path="sub-merchants/new" element={<SubMerchantForm />} />
                <Route path="sub-merchants/:id" element={<SubMerchantDetails />} />
                <Route path="settings" element={<Settings />} />
                <Route path="audit-log" element={<AuditLog />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                {/* NartBusiness (Sprint 7) */}
                <Route path="nartbusiness/dashboard" element={<NbDashboard />} />
                <Route path="nartbusiness/members" element={<NbMembers />} />
                <Route
                  path="nartbusiness/members/:memberId"
                  element={<NbMemberDetail />}
                />
                <Route path="nartbusiness/verification" element={<NbVerificationQueue />} />
                <Route path="nartbusiness/verification-policies" element={<NbVerificationPolicies />} />
                <Route path="nartbusiness/sectors" element={<NbSectors />} />
                <Route path="nartbusiness/tiers" element={<NbTierManagement />} />
                <Route path="nartbusiness/value-chain" element={<NbValueChain />} />
                <Route path="nartbusiness/embedding-jobs" element={<NbEmbeddingJobs />} />
                <Route path="nartbusiness/moderation" element={<NbModerationQueue />} />
                <Route path="nartbusiness/dlq" element={<NbDlqPanel />} />
                <Route path="nartbusiness/share-analytics" element={<NbShareAnalytics />} />
                <Route path="nartbusiness/testimonials" element={<NbTestimonials />} />
                <Route path="nartbusiness/market-opinions" element={<NbMarketOpinions />} />
              </Route>

              {/* Bilinmeyen path → rol-bilinçli landing (boş ekran yerine). */}
              <Route path="*" element={<RoleLanding />} />
            </Routes>
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
 * /dashboard yerine /nartbusiness/dashboard'a iner). Oturum yoksa /login'e.
 */
function RoleLanding() {
  const user = useAuthStore((s) => s.user);
  const roles: string[] = [];
  const r = user?.role as unknown;
  if (r instanceof Set) r.forEach((x) => roles.push(normalizeRole(String(x))));
  else if (Array.isArray(r)) r.forEach((x) => roles.push(normalizeRole(String(x))));
  else if (typeof r === 'string') roles.push(normalizeRole(r));

  if (roles.length === 0) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultPath(roles)} replace />;
}

export default App;
