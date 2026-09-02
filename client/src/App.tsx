import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import PortalShell from "./components/PortalShell";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import NewScreening from "./pages/NewScreening";
import ScreeningHistory from "./pages/ScreeningHistory";
import CaseDetail from "./pages/CaseDetail";
import Forensics from "./pages/Forensics";
import IdentityGraph from "./pages/IdentityGraph";
import RiskSimulator from "./pages/RiskSimulator";
import Reports from "./pages/Reports";
import SystemStatus from "./pages/SystemStatus";
import NotFound from "./pages/NotFound";
import { Route, Switch } from "wouter";

function WorkspaceRoutes() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/screening/new" component={NewScreening} />
    <Route path="/history" component={ScreeningHistory} />
    <Route path="/case/:caseId" component={CaseDetail} />
    <Route path="/forensics" component={Forensics} />
    <Route path="/identity-graph" component={IdentityGraph} />
    <Route path="/simulator" component={RiskSimulator} />
    <Route path="/reports" component={Reports} />
    <Route path="/system" component={SystemStatus} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <Toaster />
        <PortalShell><WorkspaceRoutes /></PortalShell>
      </TooltipProvider>
    </ThemeProvider>
  </ErrorBoundary>;
}
