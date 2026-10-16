import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import AgentPassports from "@/pages/AgentPassports";
import EvaluateAction from "@/pages/EvaluateAction";
import AirtpSession from "@/pages/AirtpSession";
import Approvals from "@/pages/Approvals";
import AuditTrail from "@/pages/AuditTrail";
import RegisterAgent from "@/pages/RegisterAgent";
import PolicyManager from "@/pages/PolicyManager";
import PolicyDetails from "@/pages/PolicyDetails";
import Integrations from "@/pages/Integrations";
import IntegrationDetail from "@/pages/IntegrationDetail";
import Alerts from "@/pages/Alerts";
import Team from "@/pages/Team";
import AgentPerformance from "@/pages/AgentPerformance";
import AccountSettings from "@/pages/AccountSettings";
import ReportExport from "@/pages/ReportExport";
import PassportDetail from "@/pages/PassportDetail";
import PromptCatalog from "@/pages/orchestration/PromptCatalog";
import PromptBuilder from "@/pages/orchestration/PromptBuilder";
import CustomerSetup from "@/pages/orchestration/CustomerSetup";
import JobRunner from "@/pages/orchestration/JobRunner";
import ExecutionHistory from "@/pages/orchestration/ExecutionHistory";
import DevOpsHandbook from "@/pages/DevOpsHandbook";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/passports" element={<AgentPassports />} />
        <Route path="/passports/:id" element={<PassportDetail />} />
        <Route path="/evaluate" element={<EvaluateAction />} />
        <Route path="/airtp" element={<AirtpSession />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/audit" element={<AuditTrail />} />
        <Route path="/register" element={<RegisterAgent />} />
        <Route path="/policy-manager" element={<PolicyManager />} />
        <Route path="/policy-details/:id" element={<PolicyDetails />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/integrations/:system" element={<IntegrationDetail />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/team" element={<Team />} />
        <Route path="/agent-performance" element={<AgentPerformance />} />
        <Route path="/account-settings" element={<AccountSettings />} />
        <Route path="/report-export" element={<ReportExport />} />
        <Route path="/orchestration" element={<PromptCatalog />} />
        <Route path="/orchestration/create-prompt" element={<PromptBuilder />} />
        <Route path="/orchestration/setup" element={<CustomerSetup />} />
        <Route path="/orchestration/run/:id" element={<JobRunner />} />
        <Route path="/orchestration/history" element={<ExecutionHistory />} />
        <Route path="/devops-handbook" element={<DevOpsHandbook />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App