import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { GenerationQueueFloat } from "@/components/generation-queue-float";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
      <GenerationQueueFloat />
    </div>
  );
}
