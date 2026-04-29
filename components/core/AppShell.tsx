import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { WorkspaceAccessGuard } from "@/components/core/WorkspaceAccessGuard";
import { PageContainer } from "@/components/core/PageContainer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell h-[100dvh] overflow-hidden py-4 lg:py-6">
      <div className="grid h-full min-h-0 gap-6 lg:grid-cols-[288px_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-w-0 min-h-0 flex flex-col gap-4 overflow-hidden">
          <Topbar />
          <MobileNav />
          <PageContainer>
            <WorkspaceAccessGuard>{children}</WorkspaceAccessGuard>
          </PageContainer>
        </div>
      </div>
    </main>
  );
}
