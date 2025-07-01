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
import { Heart, Trophy, Target } from "lucide-react";

type TargetCircle = { x: number; y: number; radius: number };
type GameState = "idle" | "playing" | "assessing" | "feedback" | "gameOver";

export function Game() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [targetCircle, setTargetCircle] = useState<TargetCircle | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessCircleAccuracyOutput | null>(null);

  useEffect(() => {
    const storedHighScore = localStorage.getItem("circleAceHighScore");
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
  }, []);

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
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem("circleAceHighScore", score.toString());
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

  return (
    <div className="flex w-full max-w-2xl flex-col items-center justify-between rounded-2xl bg-card p-6 shadow-2xl shadow-primary/10" style={{minHeight: '80vh'}}>
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
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Trophy className="h-4 w-4" /> HIGH SCORE</span>
            <span className="font-headline text-3xl font-bold">{highScore}</span>
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
            <p className="text-xl">Your final score is <span className="font-bold text-primary">{score}</span>.</p>
            {score > highScore && <p className="text-accent font-semibold">New High Score!</p>}
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
