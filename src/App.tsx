import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ActiveGameProvider } from "@/contexts/ActiveGameContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PushNotificationPrompt } from "@/components/pwa/PushNotificationPrompt";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ClubDetail from "./pages/ClubDetail";
import EventDetail from "./pages/EventDetail";
import Events from "./pages/Events";
import GameMode from "./pages/GameMode";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";
import Rules from "./pages/Rules";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import PlayPoker from "./pages/PlayPoker";
import OnlinePoker from "./pages/OnlinePoker";
import PokerHub from "./pages/PokerHub";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // Don't refetch when user returns to app
      refetchOnReconnect: false,    // Don't refetch on network reconnect
      retry: 1,                      // Limit retries to prevent loops
      staleTime: 5 * 60 * 1000,     // Data stays fresh for 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ActiveGameProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <PushNotificationPrompt />
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/club/:clubId" element={<ClubDetail />} />
                  <Route path="/event/:eventId" element={<EventDetail />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/event/:eventId/game" element={<GameMode />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/poker" element={<PokerHub />} />
                  <Route path="/play-poker" element={<PlayPoker />} />
                  <Route path="/online-poker" element={<OnlinePoker />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
              <InstallPrompt />
            </BrowserRouter>
          </TooltipProvider>
        </ActiveGameProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
