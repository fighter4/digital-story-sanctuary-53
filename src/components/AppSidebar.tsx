
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Book, Settings } from "lucide-react";
import { useState } from "react";

export function AppSidebar() {
  const [activeTab, setActiveTab] = useState<'library' | 'settings'>('library');

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Ebook Reader</h1>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveTab('library')}
                  isActive={activeTab === 'library'}
                >
                  <Book />
                  <span>Library</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setActiveTab('settings')}
                  isActive={activeTab === 'settings'}
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeTab === 'library' && (
          <SidebarGroup>
            <SidebarGroupLabel>Your Books</SidebarGroupLabel>
            <SidebarGroupContent className="space-y-4">
              <FileUpload />
              <FileList />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activeTab === 'settings' && (
          <SidebarGroup>
            <SidebarGroupLabel>Reading Preferences</SidebarGroupLabel>
            <SidebarGroupContent>
              <SettingsPanel />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
