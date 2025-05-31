
import { useState } from 'react';
import { useSpeech } from '@/hooks/useSpeech';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square, Volume2, Settings } from 'lucide-react';

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
  const [sampleText] = useState("This is a sample text to test the text-to-speech functionality.");

  const handlePlay = () => {
    if (isPaused) {
      resume();
    } else {
      speak(sampleText, { rate, pitch, volume, voice: selectedVoice });
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

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="w-4 h-4" />
        <h3 className="font-semibold">Text-to-Speech</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Playback Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
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
        <p>Note: Text-to-speech will read the currently visible content of your book.</p>
      </div>
    </div>
  );
};
