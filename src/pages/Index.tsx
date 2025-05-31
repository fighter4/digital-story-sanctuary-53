
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MainContent } from "@/components/MainContent";
import { EbookProvider } from "@/contexts/EbookContext";
import { AnnotationProvider } from "@/contexts/AnnotationContext";

const Index = () => {
  return (
    <EbookProvider>
      <AnnotationProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <MainContent />
          </div>
        </SidebarProvider>
      </AnnotationProvider>
    </EbookProvider>
  );
};

export default Index;
