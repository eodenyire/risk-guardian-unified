import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Settings from "./pages/Settings";
import RiskRegister from "./pages/RiskRegister";
import RiskUniverse from "./pages/RiskUniverse";
import RiskAppetite from "./pages/RiskAppetite";
import Contagion from "./pages/Contagion";
import KRI from "./pages/KRI";
import Controls from "./pages/Controls";
import RCSA from "./pages/RCSA";
import HeatMap from "./pages/HeatMap";
import Integrations from "./pages/Integrations";
import DataSources from "./pages/DataSources";
import IRRBB from "./pages/IRRBB";
import PrtModule from "./pages/PrtModule";
import RiskDataMaster from "./pages/RiskDataMaster";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/risk-universe" element={<RiskUniverse />} />
              <Route path="/risk-register" element={<RiskRegister />} />
              <Route path="/appetite" element={<RiskAppetite />} />
              <Route path="/contagion" element={<Contagion />} />
              <Route path="/kri" element={<KRI />} />
              <Route path="/controls" element={<Controls />} />
              <Route path="/rcsa" element={<RCSA />} />
              <Route path="/heat-map" element={<HeatMap />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/data-sources" element={<DataSources />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
