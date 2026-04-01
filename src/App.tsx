import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import RiskRegister from "./pages/RiskRegister";
import KRI from "./pages/KRI";
import Controls from "./pages/Controls";
import RCSA from "./pages/RCSA";
import HeatMap from "./pages/HeatMap";
import Integrations from "./pages/Integrations";
import DataSources from "./pages/DataSources";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/risk-register" element={<RiskRegister />} />
            <Route path="/kri" element={<KRI />} />
            <Route path="/controls" element={<Controls />} />
            <Route path="/rcsa" element={<RCSA />} />
            <Route path="/heat-map" element={<HeatMap />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/data-sources" element={<DataSources />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
