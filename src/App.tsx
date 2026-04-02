import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Businesses from './pages/Businesses/Businesses';
import BusinessDetails from './pages/Businesses/BusinessDetails';
import BusinessCreate from './pages/Businesses/BusinessCreate';
import BusinessClaims from './pages/Businesses/BusinessClaims';
import BusinessCategories from './pages/BusinessCategories/BusinessCategories';
import Events from './pages/Events/Events';
import EventCategories from './pages/EventCategories/EventCategories';
import Federations from './pages/Federations/Federations';
import FederationDetails from './pages/Federations/FederationDetails';
import AssociationDetails from './pages/Associations/AssociationDetails';
import Associations from './pages/Associations/Associations';
import NotificationsRefactored from './pages/Notifications/NotificationsRefactored';
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
import EventDetail from './pages/Events/EventDetail';
import SalesCommandCenter from './pages/SalesCommandCenter/SalesCommandCenter';
import VenueInventoryManager from './pages/VenueInventoryManager/VenueInventoryManager';
import BoxOffice from './pages/BoxOffice/BoxOffice';
import SettlementFinance from './pages/SettlementFinance/SettlementFinance';
import GateOpsLiveBoard from './pages/GateOpsLiveBoard/GateOpsLiveBoard';
import CustomerSupportConsole from './pages/CustomerSupport/CustomerSupportConsole';
import CampaignPromoEngine from './pages/CampaignPromoEngine/CampaignPromoEngine';
import SeatMapDesigner from './pages/SeatMap/SeatMapDesigner';
import EventOperations from './pages/AdminOperations/EventOperations';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <SnackbarProvider maxSnack={3}>
          <CssBaseline />
          <BrowserRouter basename="/admin">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                <Route path="devices" element={<Devices />} />
                <Route path="notifications" element={<NotificationsRefactored />} />
                <Route path="feeds" element={<FeedVideos />} />
                <Route path="bulletins" element={<Bulletins />} />
                <Route path="content" element={<ContentList />} />
                <Route path="content/new" element={<ContentEditor />} />
                <Route path="content/:id" element={<ContentDetail />} />
                <Route path="content/:id/edit" element={<ContentEditor />} />
                <Route path="users" element={<Users />} />
                <Route path="users/:id" element={<UserDetails />} />
                <Route path="businesses" element={<Businesses />} />
                <Route path="businesses/new" element={<BusinessCreate />} />
                <Route path="businesses/:id" element={<BusinessDetails />} />
                <Route path="business-claims" element={<BusinessClaims />} />
                <Route path="business-categories" element={<BusinessCategories />} />
                <Route path="events" element={<Events />} />
                <Route path="events/:id" element={<EventDetail />} />
                <Route path="sales-command" element={<SalesCommandCenter />} />
                <Route path="venue-inventory" element={<VenueInventoryManager />} />
                <Route path="box-office" element={<BoxOffice />} />
                <Route path="settlement-finance" element={<SettlementFinance />} />
                <Route path="gate-ops" element={<GateOpsLiveBoard />} />
                <Route path="customer-support" element={<CustomerSupportConsole />} />
                <Route path="campaign-engine" element={<CampaignPromoEngine />} />
                <Route path="federations" element={<Federations />} />
                <Route path="associations" element={<Associations />} />
                <Route path="federations/:id" element={<FederationDetails />} />
                <Route path="federations/:federationId/associations/:associationId" element={<AssociationDetails />} />
                <Route path="event-operations" element={<EventOperations />} />
                <Route path="event-operations/:eventId" element={<EventOperations />} />
                <Route path="event-categories" element={<EventCategories />} />
                <Route path="event/raffle-live" element={<RaffleLivePage />} />
                <Route path="ticket-creation" element={<TicketCreationPage />} />
                <Route path="ticket-creation/:eventId" element={<TicketCreationPage />} />
                <Route path="seat-map" element={<SeatMapDesigner />} />
                <Route path="associations/:associationId/:ownerId" element={<AssociationDetails />} />
                <Route path="gamification" element={<GamificationSettings />} />
                <Route path="sub-merchants" element={<SubMerchants />} />
                <Route path="sub-merchants/new" element={<SubMerchantForm />} />
                <Route path="sub-merchants/:id" element={<SubMerchantDetails />} />
              </Route>
            </Routes>
          </BrowserRouter>
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
