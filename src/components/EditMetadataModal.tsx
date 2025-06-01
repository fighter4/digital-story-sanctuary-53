import React, { useState, useEffect } from 'react';
import { EbookFile, useEbook } from '@/contexts/EbookContext';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea'; // If you want a description field
import { toast } from '@/hooks/use-toast';

interface EditMetadataModalProps {
  file: EbookFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({ file, isOpen, onClose }) => {
  const { updateFileMetadata } = useEbook();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  useEffect(() => {
    if (file) {
      setTitle(file.title || file.name.replace(/\.[^/.]+$/, ""));
      setAuthor(file.author || '');
      setGenre(file.genre || '');
      setCoverImageUrl(file.coverImageUrl || '');
    }
  }, [file]);

  const handleSave = () => {
    if (!file) return;
    if (!title.trim()) {
        toast({ title: "Error", description: "Title cannot be empty.", variant: "destructive"});
        return;
    }

    updateFileMetadata(file.id, {
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      coverImageUrl: coverImageUrl.trim(),
      name: title.trim() // Update name to reflect title change for consistency
    });
    toast({ title: "Metadata Updated", description: `Metadata for "${title}" has been saved.`});
    onClose();
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Metadata: {file.name}</DialogTitle>
          <DialogDescription>
            Update the details for this book. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="author" className="text-right">
              Author
            </Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="genre" className="text-right">
              Genre
            </Label>
            <Input
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="coverImageUrl" className="text-right">
              Cover URL
            </Label>
            <Input
              id="coverImageUrl"
              type="url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://example.com/cover.jpg"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
