// src/components/annotations/NoteTaking.tsx
import { useState, useEffect } from 'react';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Annotation } from '@/types/annotations'; // Import Annotation type

const NOTE_COLORS = [
  { name: 'Yellow', value: '#fef3c7', cssClass: 'bg-yellow-200' },
  { name: 'Blue', value: '#dbeafe', cssClass: 'bg-blue-200' },
  { name: 'Green', value: '#d1fae5', cssClass: 'bg-green-200' },
  { name: 'Pink', value: '#fce7f3', cssClass: 'bg-pink-200' },
  { name: 'Purple', value: '#e9d5ff', cssClass: 'bg-purple-200' },
  { name: 'Orange', value: '#fed7aa', cssClass: 'bg-orange-200' }
];

// Props might include a way to get current reading position
interface NoteTakingProps {
  getCurrentReadingPosition?: () => Annotation['position'] | null;
}

export const NoteTaking = ({ getCurrentReadingPosition }: NoteTakingProps) => {
  const { currentFile } = useEbook();
  const { addAnnotation, getProgress } = useAnnotations(); // getProgress to fetch current percentage
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].value);
  const [noteType, setNoteType] = useState<Annotation['type']>('note');

  // Reset form when currentFile changes
  useEffect(() => {
    setNoteContent('');
    setNoteTitle('');
    setSelectedColor(NOTE_COLORS[0].value);
    setNoteType('note');
  }, [currentFile]);


  const handleSaveNote = async () => {
    if (!currentFile || !noteContent.trim()) {
      toast({
        title: "Error",
        description: "Please select a file and enter some content for your note.",
        variant: "destructive"
      });
      return;
    }

    let position: Annotation['position'] = { percentage: 0 }; // Default position

    if (getCurrentReadingPosition) {
        const currentPositionFromReader = getCurrentReadingPosition();
        if (currentPositionFromReader) {
            position = currentPositionFromReader;
        }
    } else if (currentFile) {
        // Fallback to stored progress if getCurrentReadingPosition is not available
        const progress = getProgress(currentFile.id);
        if (progress) {
            position = { 
                cfi: progress.currentPosition.cfi,
                page: progress.currentPosition.page,
                line: progress.currentPosition.line,
                offset: progress.currentPosition.offset,
                percentage: progress.currentPosition.percentage 
            };
        }
    }


    await addAnnotation({
      fileId: currentFile.id,
      type: noteType,
      content: noteTitle.trim() || (noteType === 'bookmark' ? `Bookmark at ${position.percentage?.toFixed(0)}%` : 'Untitled Note'),
      note: noteType === 'note' || noteType === 'highlight' ? noteContent : undefined, // Only save note content for these types
      position,
      color: selectedColor
    });

    setNoteContent('');
    setNoteTitle('');
    
    toast({
      title: `${noteType.charAt(0).toUpperCase() + noteType.slice(1)} Saved`,
      description: `Your ${noteType} has been saved successfully.`,
    });
  };

  if (!currentFile) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Open a book to take notes
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <PlusCircle className="w-4 h-4" />
        <h3 className="font-semibold">Create Annotation</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">New Annotation</CardTitle>
          <CardDescription>
            Add your thoughts, highlights, or bookmarks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Type
            </label>
            <Select value={noteType} onValueChange={(value: Annotation['type']) => setNoteType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="highlight">Highlight</SelectItem>
                <SelectItem value="bookmark">Bookmark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(noteType === 'note' || noteType === 'highlight') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Title / Highlighted Text (optional for note)
              </label>
              <Input
                placeholder={noteType === 'highlight' ? "Selected text will appear here..." : "Enter note title..."}
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                disabled={noteType === 'highlight'} // Title for highlight is usually the content itself
              />
            </div>
          )}

          {(noteType === 'note' || (noteType === 'highlight' && noteTitle)) && ( // Show content/note area for notes or if highlight has text
             <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                {noteType === 'highlight' ? 'Comment (optional)' : 'Content'}
                </label>
                <Textarea
                placeholder={noteType === 'highlight' ? "Add a comment to your highlight..." : "Write your note here..."}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                />
            </div>
          )}


          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Color (for highlights & notes)
            </label>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`w-6 h-6 rounded-full border-2 transition-all
                    ${selectedColor === color.value ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-gray-300 dark:border-gray-600'}
                    hover:border-primary/70
                  `}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                  aria-label={`Select ${color.name} color`}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSaveNote} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save {noteType.charAt(0).toUpperCase() + noteType.slice(1)}
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        <p>
          {noteType === 'highlight' 
            ? "Select text in the reader, then it will appear as 'Title'. Add an optional comment."
            : "Your annotations are saved to this book."
          }
        </p>
         <p className="mt-1">
          Position is automatically captured from your current reading location.
        </p>
      </div>
    </div>
  );
};

// src/components/reading/HighlightPanel.tsx
import { useEbook } from '@/contexts/EbookContext';
// Removed useAnnotations as it's not creating annotations directly anymore
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Highlighter } from 'lucide-react'; // Icon for the panel

export const HighlightPanel = () => {
  const { preferences, updatePreferences } = useEbook();

  const highlightColors = [
    { value: '#ffeb3b', label: 'Yellow', class: 'bg-yellow-300 hover:bg-yellow-400' },
    { value: '#4caf50', label: 'Green', class: 'bg-green-400 hover:bg-green-500 text-white' },
    { value: '#2196f3', label: 'Blue', class: 'bg-blue-400 hover:bg-blue-500 text-white' },
    { value: '#ff9800', label: 'Orange', class: 'bg-orange-400 hover:bg-orange-500 text-white' },
    { value: '#e91e63', label: 'Pink', class: 'bg-pink-400 hover:bg-pink-500 text-white' },
    { value: '#9c27b0', label: 'Purple', class: 'bg-purple-500 hover:bg-purple-600 text-white' }
  ];

  const handleColorSelect = (color: string) => {
    updatePreferences({ highlightColor: color });
  };

  // Removed handleHighlightSelection as this logic should be in the reader components

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Highlighter className="w-5 h-5" />
        <h3 className="font-semibold text-lg">Highlight Settings</h3>
      </div>
      <div>
        <Label className="text-sm font-medium mb-3 block">Select Highlight Color</Label>
        <div className="grid grid-cols-3 gap-2">
          {highlightColors.map((color) => (
            <Button
              key={color.value}
              variant={preferences.highlightColor === color.value ? "default" : "outline"}
              size="sm"
              className={`justify-center ${color.class} 
                ${preferences.highlightColor === color.value ? 'ring-2 ring-offset-2 ring-primary dark:ring-offset-slate-900' : ''}
                transition-all duration-150 ease-in-out
              `}
              onClick={() => handleColorSelect(color.value)}
              aria-pressed={preferences.highlightColor === color.value}
            >
              {color.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        <p>The selected color will be used when you highlight text within the reader.</p>
        <p className="mt-1">To highlight: select text in the reader, and the reader will provide an option to highlight (functionality to be added in reader components).</p>
      </div>
    </div>
  );
};
