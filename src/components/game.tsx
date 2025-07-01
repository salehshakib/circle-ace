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

type TargetCircle = { x: number; y: number; radius: number };
type LeaderboardEntry = { name: string; score: number; time: number };
type GameState = "enterName" | "playing" | "assessing" | "feedback" | "gameOver";

export function Game() {
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
    const storedLeaderboard = localStorage.getItem("circleAceLeaderboard");
    if (storedLeaderboard) {
      try {
        const parsed = JSON.parse(storedLeaderboard);
        if (Array.isArray(parsed)) {
          setLeaderboard(parsed);
        }
      } catch (e) {
        console.error("Failed to parse leaderboard from localStorage", e);
        setLeaderboard([]);
      }
    }
  }, []);

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

  const generateTarget = useCallback(() => {
    const canvasSize = 600;
    const padding = 50;
    const minRadius = 50;
    const maxRadius = (canvasSize / 2) - padding;
    const radius = Math.floor(Math.random() * (maxRadius - minRadius + 1)) + minRadius;
    const minCoord = padding + radius;
    const maxCoord = canvasSize - padding - radius;
    const x = Math.floor(Math.random() * (maxCoord - minCoord + 1)) + minCoord;
    const y = Math.floor(Math.random() * (maxCoord - minCoord + 1)) + minCoord;
    setTargetCircle({ x, y, radius });
  }, []);
  
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
    setStartTime(Date.now());
    generateTarget();
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
      setScore((prev) => prev + result.accuracyScore);
      setLives((prev) => prev - 1);
      setGameState("feedback");
    } catch (error) {
      console.error("AI assessment failed:", error);
      setGameState("playing");
    }
  };

  const continueGame = () => {
    setAssessmentResult(null);
    if (lives > 0) {
      generateTarget();
      setGameState("playing");
    } else {
      setGameState("gameOver");
      const finalTime = elapsedTime;
      const newEntry: LeaderboardEntry = { name: playerName, score, time: finalTime };
      
      const updatedLeaderboard = [...leaderboard, newEntry]
        .sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return a.time - b.time;
        })
        .slice(0, 5);

      const oldTopScore = leaderboard[0]?.score ?? 0;
      if (score > oldTopScore || (score === oldTopScore && finalTime < (leaderboard[0]?.time ?? Infinity))) {
        setJustBeatHighScore(true);
      }

      setLeaderboard(updatedLeaderboard);
      localStorage.setItem("circleAceLeaderboard", JSON.stringify(updatedLeaderboard));
    }
  };

  const renderLives = () => (
    <div className="flex items-center gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Heart
          key={i}
          className={`h-8 w-8 transition-all duration-300 ${
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
    <div className="flex w-full max-w-4xl flex-col items-center justify-between rounded-2xl bg-card p-6 shadow-2xl shadow-primary/10" style={{minHeight: '80vh'}}>
      <header className="flex w-full items-start justify-between">
        <div className="flex items-center gap-3">
          <Icons.logo className="h-10 w-10 text-primary" />
          <h1 className="font-headline text-4xl font-bold text-primary">CircleAce</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-6 text-right">
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Target className="h-4 w-4" /> SCORE</span>
              <span className="font-headline text-3xl font-bold text-primary">{score}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Clock className="h-4 w-4" /> TIME</span>
              <span className="font-headline text-3xl font-bold">{formatTime(elapsedTime)}</span>
            </div>
          </div>
          <div className="flex items-end gap-4 text-right">
            <div className="flex flex-col items-end">
              <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Trophy className="h-4 w-4" /> TOP SCORE</span>
              <span className="font-headline text-3xl font-bold">{topScore?.score ?? 0}</span>
              {topScore && <span className="text-sm text-muted-foreground">by {topScore.name}</span>}
            </div>
            <Button variant="outline" size="icon" onClick={() => setIsLeaderboardOpen(true)}>
              <ListOrdered className="h-5 w-5" />
              <span className="sr-only">Leaderboard</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center py-8">
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
            <DrawingCanvas targetCircle={targetCircle} onDrawEnd={handleDrawEnd} disabled={gameState === 'assessing'} />
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
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold">Accuracy Score</span>
              <span className="font-headline text-2xl font-bold text-primary">{assessmentResult?.accuracyScore}</span>
            </div>
            <Progress value={assessmentResult?.accuracyScore} className="h-4" />
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
          <div className="space-y-2 py-4">
            {leaderboard.length > 0 ? (
              <ol className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <li key={index} className="flex items-center justify-between rounded-md bg-secondary p-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-lg font-bold">{index + 1}</span>
                      <span className="font-semibold">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-headline text-xl font-bold text-primary">{entry.score}</span>
                      <p className="text-sm text-muted-foreground">{formatTime(entry.time)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-center text-muted-foreground">No scores yet. Be the first!</p>
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
