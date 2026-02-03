import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="ml-[240px]">
        <TopBar
          credits={8500}
          maxCredits={10000}
          userName="Demo User"
          userPlan="Free"
        />
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>
    </div>
  )
}
