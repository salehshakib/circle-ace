"use client";

import { useState, useEffect, useCallback } from "react";
import { assessCircleAccuracy } from "@/ai/flows/assess-circle-accuracy";
import type { AssessCircleAccuracyOutput } from "@/ai/flows/assess-circle-accuracy";
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
import { Heart, Trophy, Target, Clock } from "lucide-react";

type TargetCircle = { x: number; y: number; radius: number };
type GameState = "idle" | "playing" | "assessing" | "feedback" | "gameOver";
type HighScore = { score: number; time: number | null };

export function Game() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<HighScore>({ score: 0, time: null });
  const [justBeatHighScore, setJustBeatHighScore] = useState(false);
  const [lives, setLives] = useState(3);
  const [targetCircle, setTargetCircle] = useState<TargetCircle | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessCircleAccuracyOutput | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const storedHighScore = localStorage.getItem("circleAceHighScore");
    if (storedHighScore) {
      try {
        const parsed = JSON.parse(storedHighScore);
        if (typeof parsed.score === 'number') {
          setHighScore(parsed);
        } else {
          const oldScore = parseInt(storedHighScore, 10);
          if (!isNaN(oldScore)) {
            setHighScore({ score: oldScore, time: null });
          }
        }
      } catch (e) {
        const oldScore = parseInt(storedHighScore, 10);
        if (!isNaN(oldScore)) {
          setHighScore({ score: oldScore, time: null });
        }
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

  const startGame = () => {
    setScore(0);
    setLives(3);
    setJustBeatHighScore(false);
    setElapsedTime(0);
    setStartTime(Date.now());
    generateTarget();
    setGameState("playing");
  };

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
      if (score > highScore.score || (score === highScore.score && finalTime < (highScore.time ?? Infinity))) {
        const newHighScore = { score, time: finalTime };
        setHighScore(newHighScore);
        localStorage.setItem("circleAceHighScore", JSON.stringify(newHighScore));
        setJustBeatHighScore(true);
      }
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

  return (
    <div className="flex w-full max-w-4xl flex-col items-center justify-between rounded-2xl bg-card p-6 shadow-2xl shadow-primary/10" style={{minHeight: '80vh'}}>
      <header className="flex w-full items-start justify-between">
        <div className="flex items-center gap-3">
          <Icons.logo className="h-10 w-10 text-primary" />
          <h1 className="font-headline text-4xl font-bold text-primary">CircleAce</h1>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Target className="h-4 w-4" /> SCORE</span>
            <span className="font-headline text-3xl font-bold text-primary">{score}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Clock className="h-4 w-4" /> TIME</span>
            <span className="font-headline text-3xl font-bold">{formatTime(elapsedTime)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Trophy className="h-4 w-4" /> HIGH SCORE</span>
            <span className="font-headline text-3xl font-bold">{highScore.score}</span>
            {highScore.time !== null && <span className="text-sm text-muted-foreground">in {formatTime(highScore.time)}</span>}
          </div>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center py-8">
        {gameState === "idle" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-headline text-3xl font-bold">Welcome to CircleAce!</h2>
            <p className="max-w-md text-muted-foreground">Trace the target circle as accurately as you can. The AI will score your attempt. Can you achieve a perfect score?</p>
            <Button size="lg" onClick={startGame}>Start Game</Button>
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
            <Button size="lg" onClick={startGame}>Play Again</Button>
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
    </div>
  );
}
