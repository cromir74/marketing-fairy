import { Sidebar } from "@/components/layout/sidebar";
import { SubscriptionProvider } from "@/components/subscription/SubscriptionProvider";
import { TrialManager } from "@/components/subscription/TrialManager";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SubscriptionProvider>
            <TrialManager>
                <div className="min-h-screen bg-surface-dark">
                    <Sidebar />
                    <main className="lg:pl-64 transition-all duration-300 h-full flex flex-col">
                        <div className="mx-auto max-w-5xl px-4 py-8 pt-20 lg:pt-8 w-full flex-grow">{children}</div>
                    </main>
                </div>
            </TrialManager>
        </SubscriptionProvider>
    );
}
