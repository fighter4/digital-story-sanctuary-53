
import { useEbook } from "@/contexts/EbookContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const SettingsPanel = () => {
  const { preferences, updatePreferences } = useEbook();

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'sepia', label: 'Sepia' }
  ] as const;

  const fontSizes = [12, 14, 16, 18, 20, 24];

  return (
    <div className="space-y-6 p-4">
      <div>
        <Label className="text-sm font-medium mb-3 block">Theme</Label>
        <div className="grid grid-cols-1 gap-2">
          {themes.map((theme) => (
            <Button
              key={theme.value}
              variant={preferences.theme === theme.value ? "default" : "outline"}
              size="sm"
              className="justify-start"
              onClick={() => updatePreferences({ theme: theme.value })}
            >
              {theme.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Font Size</Label>
        <div className="grid grid-cols-3 gap-2">
          {fontSizes.map((size) => (
            <Button
              key={size}
              variant={preferences.fontSize === size ? "default" : "outline"}
              size="sm"
              onClick={() => updatePreferences({ fontSize: size })}
            >
              {size}px
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Font Family</Label>
        <div className="grid grid-cols-1 gap-2">
          {['serif', 'sans-serif', 'monospace'].map((font) => (
            <Button
              key={font}
              variant={preferences.fontFamily === font ? "default" : "outline"}
              size="sm"
              className="justify-start capitalize"
              onClick={() => updatePreferences({ fontFamily: font })}
            >
              {font}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
