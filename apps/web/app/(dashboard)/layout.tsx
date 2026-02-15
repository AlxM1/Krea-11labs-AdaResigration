import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { GenerationQueueFloat } from "@/components/generation-queue-float";

// For personal use: No authentication required
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <GenerationQueueFloat />
    </div>
  );
}
