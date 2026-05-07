import { motion } from "framer-motion";
import { Outlet, Navigate, useLocation } from "react-router-dom";

import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAuthBootstrap, useLogout } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/authStore";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { canAccessRoute, isPendingOwner } from "@/config/permissions";

export function DashboardLayout() {
  const mobileSidebar = useDisclosure();
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState("locadrive.sidebar-collapsed", false);
  const logout = useLogout();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUserQuery = useAuthBootstrap();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (currentUserQuery.isPending && !user) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <LoadingState title="Restoring your session..." />
      </div>
    );
  }

  if (currentUserQuery.isError && !user) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <ErrorState description="We could not restore your session. Please try again or sign in once more." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPendingOwner(user)) {
    return <Navigate to="/pending-verification" replace />;
  }

  if (!canAccessRoute(user, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar user={user} collapsed={sidebarCollapsed} />
        <MobileSidebar open={mobileSidebar.open} onClose={mobileSidebar.onClose} user={user} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar
            user={user}
            onOpenMobileSidebar={mobileSidebar.onOpen}
            sidebarCollapsed={sidebarCollapsed}
            onToggleDesktopSidebar={() => setSidebarCollapsed((current) => !current)}
            onLogout={() => {
              void logout();
            }}
          />
          <main className="flex-1 px-4 py-6 lg:px-8">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
