
import { useEbook } from "@/contexts/EbookContext";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const SettingsPanel = () => {
  const { preferences, updatePreferences } = useEbook();
  const [customFontSize, setCustomFontSize] = useState(preferences.fontSize.toString());

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'sepia', label: 'Sepia' }
  ] as const;

  const fontSizes = [12, 14, 16, 18, 20, 24];

  const fontFamilies = [
    { value: 'serif', label: 'Serif', style: 'font-serif' },
    { value: 'sans-serif', label: 'Sans Serif', style: 'font-sans' },
    { value: 'monospace', label: 'Monospace', style: 'font-mono' },
    { value: 'Georgia, serif', label: 'Georgia', style: 'font-serif' },
    { value: 'Times New Roman, serif', label: 'Times', style: 'font-serif' },
    { value: 'Arial, sans-serif', label: 'Arial', style: 'font-sans' },
    { value: 'Helvetica, sans-serif', label: 'Helvetica', style: 'font-sans' },
    { value: 'Courier New, monospace', label: 'Courier', style: 'font-mono' }
  ];

  const highlightColors = [
    { value: '#ffeb3b', label: 'Yellow', class: 'bg-yellow-300' },
    { value: '#4caf50', label: 'Green', class: 'bg-green-300' },
    { value: '#2196f3', label: 'Blue', class: 'bg-blue-300' },
    { value: '#ff9800', label: 'Orange', class: 'bg-orange-300' },
    { value: '#e91e63', label: 'Pink', class: 'bg-pink-300' },
    { value: '#9c27b0', label: 'Purple', class: 'bg-purple-300' }
  ];

  const handleCustomFontSize = () => {
    const size = parseInt(customFontSize);
    if (size >= 8 && size <= 48) {
      updatePreferences({ fontSize: size });
    }
  };

  // Apply theme to the panel
  const getThemeClasses = () => {
    switch (preferences.theme) {
      case 'dark':
        return 'bg-gray-800 text-white';
      case 'sepia':
        return 'bg-amber-50 text-amber-900';
      default:
        return 'bg-background text-foreground';
    }
  };

  return (
    <div className={`space-y-6 p-4 ${getThemeClasses()}`}>
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
        <div className="grid grid-cols-3 gap-2 mb-3">
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
        <div className="flex gap-2">
          <Input
            type="number"
            min="8"
            max="48"
            value={customFontSize}
            onChange={(e) => setCustomFontSize(e.target.value)}
            placeholder="Custom size"
            className="flex-1"
          />
          <Button size="sm" onClick={handleCustomFontSize}>
            Apply
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Font Family</Label>
        <div className="grid grid-cols-1 gap-2">
          {fontFamilies.map((font) => (
            <Button
              key={font.value}
              variant={preferences.fontFamily === font.value ? "default" : "outline"}
              size="sm"
              className={`justify-start ${font.style}`}
              onClick={() => updatePreferences({ fontFamily: font.value })}
            >
              {font.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Highlight Color</Label>
        <div className="grid grid-cols-3 gap-2">
          {highlightColors.map((color) => (
            <Button
              key={color.value}
              variant={preferences.highlightColor === color.value ? "default" : "outline"}
              size="sm"
              className={`justify-center ${color.class} hover:${color.class} text-black`}
              onClick={() => updatePreferences({ highlightColor: color.value })}
            >
              {color.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
