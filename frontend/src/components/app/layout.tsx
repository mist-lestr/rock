import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Main } from "../layout/main";

export default function Layout({ navbar, sidebar, children }: { navbar: React.ReactNode, sidebar: React.ReactNode, children: React.ReactNode }) {
  console.log("reload layout")
  
  return (
    <div className="h-svh grid grid-rows-[auto_1fr]">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        {navbar}
      </header>
      <main>
        <SidebarProvider>
          {sidebar}
          <SidebarInset className="relative flex w-full flex-1 flex-col bg-background @container/content">
            <Main>
              {children}
            </Main>
          </SidebarInset>
        </SidebarProvider>
      </main>
    </div>
  );
}
