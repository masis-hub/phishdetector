import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import Analytics from "./pages/Analytics";
import Templates from "./pages/Templates";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CampaignDetail from "./pages/CampaignDetail";
import CompanyReports from "./pages/CompanyReports";
import MitigationPlans from "./pages/MitigationPlans";
import ResetPassword from "./pages/ResetPassword";
import SecurityFindings from "./pages/SecurityFindings";
import AdminAccess from "./pages/AdminAccess";
import AdminSenderDomains from "./pages/AdminSenderDomains";
import AdminDomainVerification from "./pages/AdminDomainVerification";
import Unsubscribe from "./pages/Unsubscribe";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<CompanyReports />} />
          <Route path="/mitigation" element={<MitigationPlans />} />
          <Route path="/security" element={<SecurityFindings />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/users" element={<Users />} />
          <Route path="/admin/access" element={<AdminAccess />} />
          <Route path="/admin/sender-domains" element={<AdminSenderDomains />} />
          <Route path="/admin/domain-verification" element={<AdminDomainVerification />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
