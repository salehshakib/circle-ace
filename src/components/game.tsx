"use client";

import { useState, useEffect, useCallback } from "react";
import { assessCircleAccuracy } from "@/ai/flows/assess-circle-accuracy";
import type { AssessCircleAccuracyOutput } from "@/ai/flows/assess-circle-accuracy";
import { generatePlayerName } from "@/ai/flows/generate-player-name";
import { DrawingCanvas } from "@/components/drawing-canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Icons } from "@/components/icons";
import { Heart, Trophy, Target, Clock, ListOrdered, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

type TargetCircle = { x: number; y: number; radius: number };
type LeaderboardEntry = { name: string; score: number; time: number };
type GameState = "enterName" | "playing" | "assessing" | "feedback" | "gameOver";

export function Game() {
  const isMobile = useIsMobile();
  const [canvasSize, setCanvasSize] = useState(600);
  const [gameState, setGameState] = useState<GameState>("enterName");
  const [playerName, setPlayerName] = useState("");
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [score, setScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [justBeatHighScore, setJustBeatHighScore] = useState(false);
  const [lives, setLives] = useState(3);
  const [targetCircle, setTargetCircle] = useState<TargetCircle | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessCircleAccuracyOutput | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (isMobile !== undefined) {
      setCanvasSize(isMobile ? 350 : 600);
    }
  }, [isMobile]);

  useEffect(() => {
    fetchLeaderboard();
    const storedPlayerName = localStorage.getItem("circleAcePlayerName");
    if (storedPlayerName) {
      setPlayerName(storedPlayerName);
    }
  }, []);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem("circleAcePlayerName", playerName);
    }
  }, [playerName]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (gameState === 'playing' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [gameState, startTime]);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/scores');
      if (response.ok) {
        const data = await response.json();
        const formattedLeaderboard = data.data.map((entry: any) => ({
          name: entry.username,
          score: entry.score,
          time: entry.time
        }));
        setLeaderboard(formattedLeaderboard);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  const saveScore = async (username: string, score: number, time: number) => {
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, score, time }),
      });
      
      if (response.ok) {
        await fetchLeaderboard();
      }
    } catch (error) {
      console.error('Failed to save score:', error);
    }
  };

  const generateTarget = useCallback(() => {
    const padding = canvasSize * 0.1;
    const minRadius = canvasSize * 0.1;
    const maxRadius = (canvasSize / 2) - padding;
    const radius = Math.floor(Math.random() * (maxRadius - minRadius + 1)) + minRadius;
    const minCoord = padding + radius;
    const maxCoord = canvasSize - padding - radius;
    const x = Math.floor(Math.random() * (maxCoord - minCoord + 1)) + minCoord;
    const y = Math.floor(Math.random() * (maxCoord - minCoord + 1)) + minCoord;
    setTargetCircle({ x, y, radius });
  }, [canvasSize]);
  
  const handleGenerateName = async () => {
    setIsGeneratingName(true);
    try {
      const result = await generatePlayerName();
      setPlayerName(result.name);
    } catch (error) {
      console.error("Failed to generate player name:", error);
    } finally {
      setIsGeneratingName(false);
    }
  };

  const startGame = () => {
    if (!playerName.trim()) return;
    setScore(0);
    setLives(3);
    setJustBeatHighScore(false);
    setElapsedTime(0);
    generateTarget();
    setStartTime(Date.now());
    setGameState("playing");
  };
  
  const resetGame = () => {
    setGameState("enterName");
  }

  const handleDrawEnd = async (dataUri: string) => {
    if (!targetCircle) return;
    setGameState("assessing");
    try {
      const result = await assessCircleAccuracy({
        drawnCircleDataUri: dataUri,
        targetCircle,
      });
      setAssessmentResult(result);
      setScore((prev) => prev + result.finalScore);
      setLives((prev) => prev - 1);
      setGameState("feedback");
    } catch (error)
     {
      console.error("AI assessment failed:", error);
      // Give life back if AI fails
      setGameState("playing");
    }
  };

  const continueGame = async () => {
    setAssessmentResult(null);
    if (lives > 0) {
      generateTarget();
      setGameState("playing");
    } else {
      setGameState("gameOver");
      const finalTime = elapsedTime;
      
      const oldTopScore = leaderboard[0]?.score ?? 0;
      if (score > oldTopScore || (score === oldTopScore && finalTime < (leaderboard[0]?.time ?? Infinity))) {
        setJustBeatHighScore(true);
      }

      await saveScore(playerName, score, finalTime);
    }
  };

  const renderLives = () => (
    <div className="flex items-center gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Heart
          key={i}
          className={`h-6 w-6 md:h-8 md:w-8 transition-all duration-300 ${
            i < lives ? "text-destructive fill-destructive" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(1) + 's';
  }
  
  const topScore = leaderboard[0];

  return (
    <div className="flex w-full max-w-4xl flex-col items-center justify-between rounded-2xl bg-card p-4 md:p-6 shadow-2xl shadow-primary/10" style={{minHeight: '80vh'}}>
      <header className="flex w-full flex-col items-center gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Icons.logo className="h-8 w-8 md:h-10 md:w-10 text-primary" />
          <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary">CircleAce</h1>
        </div>
        <div className="flex items-end gap-4 md:gap-6 text-right">
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground"><Clock className="h-4 w-4" /> TIME</span>
            <span className="font-headline text-2xl md:text-3xl font-bold">{formatTime(elapsedTime)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground"><Target className="h-4 w-4" /> SCORE</span>
            <span className="font-headline text-2xl md:text-3xl font-bold text-primary">{score}</span>
          </div>
          <div className="flex flex-col items-end">
              <span className="flex items-center gap-2 text-xs md:text-sm font-medium text-muted-foreground"><Trophy className="h-4 w-4" /> TOP SCORE</span>
              <span className="font-headline text-2xl md:text-3xl font-bold">{topScore?.score ?? 0}</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => setIsLeaderboardOpen(true)} className="h-9 w-9 md:h-10 md:w-10 hover:bg-primary/10 hover:text-primary">
            <ListOrdered className="h-4 w-4 md:h-5 md:w-5" />
            <span className="sr-only">Leaderboard</span>
          </Button>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center py-4 md:py-8">
        {gameState === "enterName" && (
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 className="font-headline text-3xl font-bold">Welcome to CircleAce!</h2>
              <p className="max-w-md text-muted-foreground">Enter a name to start playing and compete for a spot on the leaderboard.</p>
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Player Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="h-12 text-lg"
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-12 w-12 flex-shrink-0"
                  onClick={handleGenerateName}
                  disabled={isGeneratingName}
                >
                  {isGeneratingName ? <RefreshCw className="animate-spin" /> : <RefreshCw />}
                  <span className="sr-only">Generate Name</span>
                </Button>
              </div>
              <Button size="lg" onClick={startGame} disabled={!playerName.trim()}>Start Game</Button>
            </div>
        )}

        {(gameState === "playing" || gameState === "assessing") && targetCircle && (
          <div className="relative">
            {canvasSize > 0 ? (
              <DrawingCanvas 
                targetCircle={targetCircle} 
                onDrawEnd={handleDrawEnd} 
                disabled={gameState === 'assessing'}
                width={canvasSize}
                height={canvasSize}
              />
            ) : (
              <div style={{width: '350px', height: '350px'}} className="flex items-center justify-center">
                 <div className="animate-pulse font-bold text-primary">Loading...</div>
              </div>
            )}
            {gameState === "assessing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm">
                <div className="animate-pulse font-bold text-primary">Assessing...</div>
              </div>
            )}
          </div>
        )}
        
        {gameState === "gameOver" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-headline text-3xl font-bold">Game Over!</h2>
            <p className="text-xl">Your final score is <span className="font-bold text-primary">{score}</span> in <span className="font-bold text-primary">{formatTime(elapsedTime)}</span>.</p>
            {justBeatHighScore && <p className="text-accent font-semibold">New High Score!</p>}
            <div className="flex gap-4">
              <Button size="lg" onClick={startGame}>Play Again</Button>
              <Button size="lg" variant="outline" onClick={resetGame}>Change Name</Button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full flex justify-center">{renderLives()}</footer>

      <Dialog open={gameState === "feedback"} onOpenChange={(open) => !open && continueGame()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Attempt Result</DialogTitle>
            <DialogDescription>{assessmentResult?.feedback}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-[max-content_1fr_auto] items-center gap-x-4 gap-y-2">
              <span className="font-semibold text-sm text-muted-foreground">Accuracy</span>
              <Progress value={assessmentResult?.accuracyScore} className="h-2" />
              <span className="font-bold tabular-nums">{assessmentResult?.accuracyScore}</span>
              
              <span className="font-semibold text-sm text-muted-foreground">Perfection</span>
              <Progress value={assessmentResult?.perfectionScore} className="h-2" />
              <span className="font-bold tabular-nums">{assessmentResult?.perfectionScore}</span>
            </div>
            
            <div className="space-y-2 pt-4">
               <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">Final Score</span>
                <span className="font-headline text-2xl font-bold text-primary">{assessmentResult?.finalScore}</span>
              </div>
              <Progress value={assessmentResult?.finalScore} className="h-4" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={continueGame} className="w-full">
              {lives > 0 ? "Next Round" : "Finish Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
              <ListOrdered /> Leaderboard
            </DialogTitle>
            <DialogDescription>Top 5 Circle Aces. Higher score is better. Faster time breaks ties.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {leaderboard.length > 0 ? (
              <>
                <div className="grid grid-cols-[2rem,1fr,4rem,4rem] gap-4 px-3 text-sm font-semibold text-muted-foreground">
                  <span className="text-center">#</span>
                  <span>Player</span>
                  <span className="text-right">Score</span>
                  <span className="text-right">Time</span>
                </div>
                <ol className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <li key={index} className="grid grid-cols-[2rem,1fr,4rem,4rem] items-center gap-4 rounded-md bg-secondary p-3">
                      <span className="text-center text-lg font-bold">{index + 1}</span>
                      <span className="truncate font-semibold">{entry.name}</span>
                      <span className="text-right font-headline text-xl font-bold text-primary">{entry.score}</span>
                      <span className="text-right text-sm text-muted-foreground">{formatTime(entry.time)}</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No scores yet. Be the first!</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsLeaderboardOpen(false)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
