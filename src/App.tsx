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
                <Route path="users" element={<Users />} />
                <Route path="users/:id" element={<UserDetails />} />
                <Route path="businesses" element={<Businesses />} />
                <Route path="businesses/:id" element={<BusinessDetails />} />
                <Route path="business-categories" element={<BusinessCategories />} />
                <Route path="events" element={<Events />} />
                <Route path="federations" element={<Federations />} />
                <Route path="associations" element={<Associations />} />
                <Route path="federations/:id" element={<FederationDetails />} />
                <Route path="federations/:federationId/associations/:associationId" element={<AssociationDetails />} />
                <Route path="event-categories" element={<EventCategories />} />
                <Route path="event/raffle-live" element={<RaffleLivePage />} />
                <Route path="ticket-creation" element={<TicketCreationPage />} />
                <Route path="ticket-creation/:eventId" element={<TicketCreationPage />} />
                <Route path="associations/:associationId/:ownerId" element={<AssociationDetails />} />
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
