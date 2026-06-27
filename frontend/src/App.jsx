import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import { RequireAuth, RequireAdmin, RedirectIfAuthed } from './components/RouteGuards.jsx';

import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import CustomerProfilePage from './pages/CustomerProfilePage.jsx';
import PurchasesPage from './pages/PurchasesPage.jsx';
import SegmentsPage from './pages/SegmentsPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerProfilePage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/segments" element={<SegmentsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route
          path="/team"
          element={
            <RequireAdmin>
              <TeamPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
