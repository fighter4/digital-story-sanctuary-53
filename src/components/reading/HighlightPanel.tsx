
import { useEbook } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export const HighlightPanel = () => {
  const { preferences, updatePreferences } = useEbook();
  const { addAnnotation } = useAnnotations();

  const highlightColors = [
    { value: '#ffeb3b', label: 'Yellow', class: 'bg-yellow-300' },
    { value: '#4caf50', label: 'Green', class: 'bg-green-300' },
    { value: '#2196f3', label: 'Blue', class: 'bg-blue-300' },
    { value: '#ff9800', label: 'Orange', class: 'bg-orange-300' },
    { value: '#e91e63', label: 'Pink', class: 'bg-pink-300' },
    { value: '#9c27b0', label: 'Purple', class: 'bg-purple-300' }
  ];

  const handleColorSelect = (color: string) => {
    updatePreferences({ highlightColor: color });
  };

  const handleHighlightSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      
      // Create a highlight annotation
      addAnnotation({
        fileId: '', // This will be set by the reader component
        type: 'highlight',
        content: selectedText,
        position: {
          percentage: 0 // This will be calculated by the reader
        },
        color: preferences.highlightColor
      });

      // Apply highlight styling to the selection
      try {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.backgroundColor = preferences.highlightColor;
        span.style.padding = '2px 0';
        span.appendChild(range.extractContents());
        range.insertNode(span);
        selection.removeAllRanges();
      } catch (error) {
        console.log('Highlight application failed:', error);
      }
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <Label className="text-sm font-medium mb-3 block">Highlight Color</Label>
        <div className="grid grid-cols-3 gap-2">
          {highlightColors.map((color) => (
            <Button
              key={color.value}
              variant={preferences.highlightColor === color.value ? "default" : "outline"}
              size="sm"
              className={`justify-center ${color.class} hover:${color.class}`}
              onClick={() => handleColorSelect(color.value)}
            >
              {color.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Button 
          onClick={handleHighlightSelection}
          className="w-full"
          variant="default"
        >
          Highlight Selected Text
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Select text first, then click this button to highlight it.
        </p>
      </div>
    </div>
  );
};
