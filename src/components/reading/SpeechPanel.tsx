
import { useState, useEffect } from 'react';
import { useSpeech } from '@/hooks/useSpeech';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square, Volume2, SkipForward, SkipBack } from 'lucide-react';
import { extractTextFromFile, extractVisibleText } from '@/utils/textExtraction';
import { toast } from '@/hooks/use-toast';

export const SpeechPanel = () => {
  const { currentFile } = useEbook();
  const { 
    speak, 
    pause, 
    resume, 
    stop, 
    isPlaying, 
    isPaused, 
    voices, 
    selectedVoice, 
    setSelectedVoice 
  } = useSpeech();
  
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [extractedText, setExtractedText] = useState('');
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [readingMode, setReadingMode] = useState<'visible' | 'full'>('visible');

  useEffect(() => {
    if (currentFile && readingMode === 'full') {
      extractFullText();
    }
  }, [currentFile, readingMode]);

  const extractFullText = async () => {
    if (!currentFile) return;
    
    setIsExtracting(true);
    try {
      const result = await extractTextFromFile(currentFile.file, currentFile.type);
      if (result.success) {
        setExtractedText(result.text);
        toast({
          title: "Text extracted",
          description: "Ready for text-to-speech"
        });
      } else {
        toast({
          title: "Extraction failed",
          description: result.error || "Could not extract text",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to extract text from file",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const extractCurrentViewText = () => {
    // Try to extract text from the currently visible content
    const readerElement = document.querySelector('[data-reader-content]') as HTMLElement || 
                          document.querySelector('.epub-container') as HTMLElement ||
                          document.querySelector('pre') as HTMLElement ||
                          document.querySelector('canvas')?.parentElement as HTMLElement;
    
    if (readerElement) {
      const visibleText = extractVisibleText(readerElement);
      if (visibleText) {
        setExtractedText(visibleText);
        return visibleText;
      }
    }
    
    return '';
  };

  const handlePlay = () => {
    if (isPaused) {
      resume();
      return;
    }

    let textToRead = '';
    
    if (readingMode === 'visible') {
      textToRead = extractCurrentViewText();
      if (!textToRead) {
        toast({
          title: "No text found",
          description: "Could not extract text from current view",
          variant: "destructive"
        });
        return;
      }
    } else {
      textToRead = extractedText;
      if (!textToRead) {
        toast({
          title: "No text available",
          description: "Please extract text first",
          variant: "destructive"
        });
        return;
      }
    }

    // Split text into sentences for better control
    const sentences = textToRead.match(/[^\.!?]+[\.!?]+/g) || [textToRead];
    const currentSentence = sentences[currentPosition] || sentences[0];
    
    speak(currentSentence, { rate, pitch, volume, voice: selectedVoice });
  };

  const handleNext = () => {
    if (extractedText) {
      const sentences = extractedText.match(/[^\.!?]+[\.!?]+/g) || [extractedText];
      const nextPosition = Math.min(currentPosition + 1, sentences.length - 1);
      setCurrentPosition(nextPosition);
      
      if (isPlaying) {
        stop();
        setTimeout(() => {
          speak(sentences[nextPosition], { rate, pitch, volume, voice: selectedVoice });
        }, 100);
      }
    }
  };

  const handlePrevious = () => {
    if (extractedText) {
      const sentences = extractedText.match(/[^\.!?]+[\.!?]+/g) || [extractedText];
      const prevPosition = Math.max(currentPosition - 1, 0);
      setCurrentPosition(prevPosition);
      
      if (isPlaying) {
        stop();
        setTimeout(() => {
          speak(sentences[prevPosition], { rate, pitch, volume, voice: selectedVoice });
        }, 100);
      }
    }
  };

  const handleVoiceChange = (voiceURI: string) => {
    const voice = voices.find(v => v.voiceURI === voiceURI);
    if (voice) {
      setSelectedVoice(voice);
    }
  };

  if (!currentFile) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Open a book to use text-to-speech
      </div>
    );
  }

  const sentences = extractedText ? (extractedText.match(/[^\.!?]+[\.!?]+/g) || [extractedText]) : [];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="w-4 h-4" />
        <h3 className="font-semibold">Text-to-Speech</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reading Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={readingMode} onValueChange={(value: 'visible' | 'full') => setReadingMode(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visible">Read Visible Text</SelectItem>
              <SelectItem value="full">Read Full Document</SelectItem>
            </SelectContent>
          </Select>

          {readingMode === 'full' && (
            <div className="space-y-2">
              <Button 
                onClick={extractFullText} 
                disabled={isExtracting}
                className="w-full"
                variant="outline"
              >
                {isExtracting ? 'Extracting...' : 'Extract Text'}
              </Button>
              {extractedText && (
                <div className="text-xs text-muted-foreground">
                  {sentences.length} sentences ready • Position: {currentPosition + 1}/{sentences.length}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Playback Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {readingMode === 'full' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentPosition <= 0}
              >
                <SkipBack className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant={isPlaying && !isPaused ? 'default' : 'outline'}
              size="sm"
              onClick={handlePlay}
              disabled={!voices.length}
            >
              {isPlaying && !isPaused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying && !isPaused ? 'Pause' : 'Play'}
            </Button>

            {isPaused && (
              <Button variant="outline" size="sm" onClick={resume}>
                Resume
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={stop}
              disabled={!isPlaying && !isPaused}
            >
              <Square className="w-4 h-4" />
              Stop
            </Button>

            {readingMode === 'full' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentPosition >= sentences.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Voice Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Voice
            </label>
            <Select value={selectedVoice?.voiceURI || ''} onValueChange={handleVoiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Speed: {rate}x
            </label>
            <Slider
              value={[rate]}
              onValueChange={(value) => setRate(value[0])}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Pitch: {pitch}
            </label>
            <Slider
              value={[pitch]}
              onValueChange={(value) => setPitch(value[0])}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Volume: {Math.round(volume * 100)}%
            </label>
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        <p>
          {readingMode === 'visible' 
            ? 'Reads the currently visible content of your book.' 
            : 'Reads the full document with navigation controls.'
          }
        </p>
      </div>
    </div>
  );
};
