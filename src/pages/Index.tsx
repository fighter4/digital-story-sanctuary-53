
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MainContent } from "@/components/MainContent";
import { EbookProvider } from "@/contexts/EbookContext";

const Index = () => {
  return (
    <EbookProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <MainContent />
        </div>
      </SidebarProvider>
    </EbookProvider>
  );
};

export default Index;
