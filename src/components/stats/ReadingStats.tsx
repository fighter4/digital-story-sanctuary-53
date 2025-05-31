
import { useAnnotations } from '@/contexts/AnnotationContext';
import { useEbook } from '@/contexts/EbookContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Target, Trophy } from 'lucide-react';

export const ReadingStats = () => {
  const { files } = useEbook();
  const { readingProgress, readingSessions, getSessionsForFile } = useAnnotations();

  const totalBooks = files.length;
  const booksFinished = Object.values(readingProgress).filter(p => p.isFinished).length;
  const totalReadingTime = Object.values(readingProgress).reduce((total, p) => total + p.totalReadingTime, 0);
  const averageProgress = Object.values(readingProgress).length > 0 
    ? Object.values(readingProgress).reduce((total, p) => total + p.currentPosition.percentage, 0) / Object.values(readingProgress).length
    : 0;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getReadingStreak = () => {
    const today = new Date();
    const sessions = readingSessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    let streak = 0;
    let currentDate = new Date(today);

    for (const session of sessions) {
      const sessionDate = new Date(session.startTime);
      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate = new Date(sessionDate);
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">Reading Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reading Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(totalReadingTime)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Books Completed</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{booksFinished}/{totalBooks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(averageProgress)}%</div>
              <Progress value={averageProgress} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reading Streak</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getReadingStreak()} days</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Books</CardTitle>
            <CardDescription>Your reading progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.slice(0, 5).map((file) => {
                const progress = readingProgress[file.id];
                const sessions = getSessionsForFile(file.id);
                
                return (
                  <div key={file.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{file.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {file.type.toUpperCase()}
                        </Badge>
                        {progress && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(progress.currentPosition.percentage)}% complete
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatTime(progress?.totalReadingTime || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sessions.length} sessions
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
