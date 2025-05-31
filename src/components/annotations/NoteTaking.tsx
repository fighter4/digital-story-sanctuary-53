
import { useState } from 'react';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const NOTE_COLORS = [
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Green', value: '#d1fae5' },
  { name: 'Pink', value: '#fce7f3' },
  { name: 'Purple', value: '#e9d5ff' },
  { name: 'Orange', value: '#fed7aa' }
];

export const NoteTaking = () => {
  const { currentFile } = useEbook();
  const { addAnnotation } = useAnnotations();
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].value);
  const [noteType, setNoteType] = useState<'note' | 'highlight' | 'bookmark'>('note');

  const handleSaveNote = () => {
    if (!currentFile || !noteContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your note.",
        variant: "destructive"
      });
      return;
    }

    addAnnotation({
      fileId: currentFile.id,
      type: noteType,
      content: noteTitle || 'Untitled Note',
      note: noteContent,
      position: {
        page: 1, // This would be dynamic based on current position
        percentage: 0 // This would be calculated based on current reading position
      },
      color: selectedColor
    });

    setNoteContent('');
    setNoteTitle('');
    
    toast({
      title: "Note saved",
      description: "Your note has been saved successfully."
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
        <h3 className="font-semibold">Take Notes</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">New Note</CardTitle>
          <CardDescription>
            Add your thoughts and highlights while reading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Note Type
            </label>
            <Select value={noteType} onValueChange={(value: any) => setNoteType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-200"></div>
                    Note
                  </div>
                </SelectItem>
                <SelectItem value="highlight">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-200"></div>
                    Highlight
                  </div>
                </SelectItem>
                <SelectItem value="bookmark">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-200"></div>
                    Bookmark
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Title (optional)
            </label>
            <Input
              placeholder="Enter note title..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Content
            </label>
            <Textarea
              placeholder="Write your note here..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Color
            </label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`w-6 h-6 rounded border-2 ${
                    selectedColor === color.value ? 'border-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSaveNote} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Note
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        <p>Your notes are automatically saved to this book and can be viewed in the Annotations panel.</p>
      </div>
    </div>
  );
};
