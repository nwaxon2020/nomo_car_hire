"use client";

import { useState, useEffect, useRef } from "react";
import { FaTimes, FaLightbulb, FaTrophy, FaHeart, FaPlusCircle, FaInfoCircle, FaStar, FaBook } from "react-icons/fa";
import { WORDS, WordEntry } from "./wordData";
import { GAME_RULES } from "./rules";

export default function WordGuessGame({ onClose }: { onClose?: () => void }) {
  const [currentWordObj, setCurrentWordObj] = useState<WordEntry | null>(null);
  const [guessed, setGuessed] = useState<string[]>([]);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [score, setScore] = useState(0);
  const [showError, setShowError] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // timing
  const HINT_REFILL_TIME_MS = 15 * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const hasLoaded = useRef(false);

  // Fix 1: Use a functional update for the score to prevent stale closures
  const saveGameState = (newScore: number, newHistory: string[], currentHints: number) => {
    if (hasLoaded.current && typeof window !== "undefined") {
      localStorage.setItem("nomo-trivia-score", newScore.toString());
      localStorage.setItem("nomo-used-history", JSON.stringify(newHistory));
      localStorage.setItem("nomo-hints-left", currentHints.toString());
    }
  };

  const calculateAndAddPoints = () => {
    if (!currentWordObj) return 0;

    const multiplier = currentWordObj.points;
    const letters = currentWordObj.term.split("").filter(l => l !== " " && l !== "-");
    const totalPoints = multiplier * letters.length;

    // We use the functional setter to ensure we have the absolute latest score
    setScore((prevScore) => {
      const updatedScore = prevScore + totalPoints;
      saveGameState(updatedScore, usedWords, hintsLeft);
      return updatedScore;
    });

    setPointsEarned(totalPoints);
    setShowPointsAnimation(true);
    setTimeout(() => setShowPointsAnimation(false), 2000);

    return totalPoints;
  };

  const resetGame = (currentHistory: string[] = usedWords) => {
    let memoryPool = [...currentHistory];
    if (memoryPool.length >= 500) {
      memoryPool = [];
      setUsedWords([]);
    }

    const availableWords = WORDS.filter((entry: WordEntry) => !memoryPool.includes(entry.term.toLowerCase()));
    const pool = availableWords.length > 0 ? availableWords : WORDS;
    const selectedEntry = pool[Math.floor(Math.random() * pool.length)];

    setCurrentWordObj(selectedEntry);

    const initialGuessed: string[] = [];
    selectedEntry.term.split("").forEach(char => {
      if (char === " " || char === "-") {
        initialGuessed.push(char);
      }
    });
    setGuessed(initialGuessed);
    setWrongGuesses(0);
    // REMOVED: setHintsLeft(3) - Hints now persist across games
    setGameOver(false);
    setWin(false);
    setPointsEarned(0);

    if (!currentHistory.includes(selectedEntry.term.toLowerCase())) {
      const updatedHistory = [...currentHistory, selectedEntry.term.toLowerCase()];
      setUsedWords(updatedHistory);
      saveGameState(score, updatedHistory, hintsLeft);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedScore = localStorage.getItem("nomo-trivia-score");
      const savedHistory = localStorage.getItem("nomo-used-history");
      const savedHints = localStorage.getItem("nomo-hints-left");
      const lastRefill = localStorage.getItem("nomo-hint-refill-time");

      const initialScore = savedScore ? parseInt(savedScore) : 0;
      const initialHistory = savedHistory ? JSON.parse(savedHistory) : [];
      let initialHints = savedHints ? parseInt(savedHints) : 3;

      // Logic for 20-minute refill
      // Logic for hint refill
      const now = Date.now();

      if (lastRefill) {
        const timePassed = now - parseInt(lastRefill);
        // Uses our new constant variable
        if (timePassed >= HINT_REFILL_TIME_MS) {
          initialHints = 3;
          localStorage.setItem("nomo-hint-refill-time", now.toString());
        }
      } else {
        localStorage.setItem("nomo-hint-refill-time", now.toString());
      }

      setScore(initialScore);
      setUsedWords(initialHistory);
      setHintsLeft(initialHints);
      hasLoaded.current = true;

      const availableWords = WORDS.filter((entry: WordEntry) => !initialHistory.includes(entry.term.toLowerCase()));
      const pool = availableWords.length > 0 ? availableWords : WORDS;
      const selectedEntry = pool[Math.floor(Math.random() * pool.length)];

      setCurrentWordObj(selectedEntry);

      const initialGuessed: string[] = [];
      selectedEntry.term.split("").forEach(char => {
        if (char === " " || char === "-") {
          initialGuessed.push(char);
        }
      });
      setGuessed(initialGuessed);
    }
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const lastRefill = localStorage.getItem("nomo-hint-refill-time");
      if (lastRefill && hintsLeft < 3) {
        const now = Date.now();
        const timePassed = now - parseInt(lastRefill);
        const remaining = Math.max(0, HINT_REFILL_TIME_MS - timePassed);
        setTimeLeft(remaining);

        // If timer hits zero while user is playing, refill automatically
        if (remaining === 0) {
          setHintsLeft(3);
          localStorage.setItem("nomo-hints-left", "3");
        }
      } else {
        setTimeLeft(0);
      }
    };

    const timerId = setInterval(updateTimer, 1000);
    updateTimer(); // Run once immediately

    return () => clearInterval(timerId);
  }, [hintsLeft]);

  // Helper to format milliseconds to MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const buyHints = () => {
    if (score >= 5) {
      const newScore = score - 5;
      setScore(newScore);
      setHintsLeft(3);
      saveGameState(newScore, usedWords, 3);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
  };

  const handleHint = () => {
    if (hintsLeft <= 0 || gameOver || win || !currentWordObj) return;
    const wordLower = currentWordObj.term.toLowerCase();
    const lettersToGuess = wordLower.split("").filter(l => l !== " " && l !== "-" && !guessed.includes(l));
    if (lettersToGuess.length > 0) {
      const randomHint = lettersToGuess[Math.floor(Math.random() * lettersToGuess.length)];
      handleKeyClick(randomHint);

      const newHints = hintsLeft - 1;
      setHintsLeft(newHints);
      saveGameState(score, usedWords, newHints);

      // If user just used the last hint, mark the time for the next refill
      if (newHints === 0) {
        localStorage.setItem("nomo-hint-refill-time", Date.now().toString());
      }
    }
  };

  const checkAllGuessed = (newGuessed: string[]) => {
    if (!currentWordObj) return false;
    const wordLower = currentWordObj.term.toLowerCase();
    const requiredLetters = wordLower.split("").filter(l => l !== " " && l !== "-");
    const allGuessed = requiredLetters.every(l => newGuessed.includes(l));

    if (allGuessed && !win && !gameOver) {
      calculateAndAddPoints();
      setWin(true);
      return true;
    }
    return false;
  };

  const handleKeyClick = (letter: string) => {
    if (gameOver || win || !currentWordObj || guessed.includes(letter)) return;

    const newGuessed = [...guessed, letter];
    setGuessed(newGuessed);

    if (!currentWordObj.term.toLowerCase().includes(letter)) {
      const newWrong = wrongGuesses + 1;
      setWrongGuesses(newWrong);
      if (newWrong >= 6) setGameOver(true);
    } else {
      checkAllGuessed(newGuessed);
    }
  };

  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

  const getDisplayWord = () => {
    if (!currentWordObj) return [];
    return currentWordObj.term.split("").map((char) => {
      if (char === " ") return " ";
      if (char === "-") return "-";
      if (guessed.includes(char.toLowerCase()) || gameOver) return char;
      return "_";
    });
  };

  const getPointsDisplay = () => {
    if (!currentWordObj) return null;
    const multiplier = currentWordObj.points;
    const letters = currentWordObj.term.split("").filter(l => l !== " " && l !== "-");
    const totalPoints = multiplier * letters.length;

    return (
      <div className="text-center">
        <span className={`${multiplier === 3 ? 'text-amber-400' : multiplier === 2 ? 'text-purple-400' : 'text-blue-400'} text-xs font-black uppercase`}>
          ★ {multiplier}x Multiplier
        </span>
        <span className="text-gray-400 text-[10px] ml-2">({letters.length} letters = {totalPoints} pts)</span>
      </div>
    );
  };

  if (!currentWordObj) return null;

  return (
    <div className="relative w-full max-w-xl mx-auto px-3 md:px-4 py-5 bg-[#0a1628] md:rounded-[2rem] shadow-2xl border border-blue-500/20 text-white overflow-hidden">
      {showPointsAnimation && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full text-2xl font-bold shadow-2xl">
            +{pointsEarned} POINTS!
          </div>
        </div>
      )}

      {showError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">
            Not enough points!
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-500/10">
          <FaTrophy className="text-amber-400 text-[10px]" />
          <span className="text-[10px] font-black tracking-tight">{score} PTS</span>
        </div>
        <h2 className="text-center md:text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent uppercase italic">
          Transport Trivia
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setShowRules(true)} className="text-blue-400 hover:text-cyan-400 transition-colors p-1" title="View Rules"><FaBook size={18} /></button>
          <button onClick={onClose} className="text-blue-400 hover:text-red-400 transition-colors p-1"><FaTimes size={18} /></button>
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <div className="text-sm bg-gradient-to-r from-blue-900/50 to-purple-900/50 px-4 py-1.5 rounded-full border border-blue-500/30">
          {getPointsDisplay()}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
          {hintsLeft > 0 ? (
            <button onClick={handleHint} disabled={gameOver || win} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 uppercase text-[8px] font-black">
              <FaLightbulb size={10} /> Hint ({hintsLeft})
            </button>
          ) : (
            <div className="flex flex-col items-center">
              {hintsLeft < 3 && (
                <small className="text-[9px] text-white mb-1 font-medium">
                  Refill in {formatTime(timeLeft)}
                </small>
              )}
              <button
                onClick={buyHints}
                disabled={gameOver || win}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 uppercase text-[8px] font-black hover:bg-emerald-500/20 transition-colors"
              >
                <FaPlusCircle size={10} /> Buy (5 PTS)
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {[...Array(6)].map((_, i) => (
            <FaHeart key={i} size={14} className={`transition-all ${i >= (6 - wrongGuesses) ? "text-slate-800 scale-75" : "text-emerald-500"}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-1 gap-y-2 mb-6 min-h-[60px]">
        {getDisplayWord().map((char, i) => {
          const isSpecial = char === " " || char === "-";
          const wasGuessed = guessed.includes(char.toLowerCase());

          return (
            <div key={i} className="flex flex-col items-center">
              <span className={`
                inline-block w-6 sm:w-8 h-8 sm:h-10 text-base sm:text-lg font-black text-center flex items-center justify-center transition-all
                ${isSpecial ? "border-transparent w-2" : "border-b-2 border-blue-900/50"}
                ${wasGuessed && !isSpecial ? "border-blue-400 text-white" : ""}
                ${gameOver && !wasGuessed && !isSpecial ? "border-red-500/50 !text-red-500" : ""}
                ${!wasGuessed && !gameOver && !isSpecial ? "text-transparent" : ""}
              `}>
                {char !== "_" || isSpecial ? char.toUpperCase() : ""}
              </span>
            </div>
          );
        })}
      </div>

      {(gameOver || win) && (
        <div className="mb-4 mx-1 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white/95 p-3 rounded-xl border border-blue-200 shadow-lg">
            <div className="flex items-center gap-2 mb-0.5">
              <FaInfoCircle className="text-blue-600" size={12} />
              <span className="text-blue-900 font-black uppercase text-[8px] tracking-widest">Fact</span>
            </div>
            <p className="text-slate-700 text-[10px] leading-tight font-medium">
              <span className="font-black text-blue-600 uppercase">{currentWordObj.term}:</span> {currentWordObj.definition}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1 mb-4">
        {alphabet.map((letter) => {
          const isGuessed = guessed.includes(letter);
          const isCorrect = currentWordObj.term.toLowerCase().includes(letter);
          return (
            <button
              key={letter}
              onClick={() => handleKeyClick(letter)}
              disabled={gameOver || win || isGuessed}
              className={`h-8 sm:h-9 rounded-md text-[10px] font-bold uppercase transition-all border
                ${!isGuessed && !gameOver && !win ? "bg-blue-950/40 border-blue-800/30 text-blue-100 hover:bg-blue-900/60" : ""}
                ${isGuessed && isCorrect ? "bg-green-600 border-green-500 text-white" : ""}
                ${isGuessed && !isCorrect ? "bg-red-900/40 border-red-800/30 text-red-400 line-through" : ""}
                ${(gameOver || win) && !isGuessed ? "opacity-50" : ""}
              `}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <div className="text-center min-h-[60px] flex flex-col items-center justify-center">
        {gameOver && (
          <div className="space-y-2">
            <p className="text-red-400 text-xs font-bold uppercase">GAME OVER!</p>
            <button onClick={() => resetGame()} className="bg-blue-600 text-white px-6 py-1.5 rounded-lg font-black text-[9px] uppercase">Try Again</button>
          </div>
        )}
        {win && (
          <div className="space-y-2">
            <p className="text-cyan-400 text-xs font-bold uppercase tracking-tight">CORRECT! +{pointsEarned} PTS! 🏆</p>
            <button onClick={() => resetGame()} className="bg-white text-[#0a1628] px-6 py-1.5 rounded-lg font-black text-[9px] uppercase">Next Word</button>
          </div>
        )}
        {!gameOver && !win && (
          <button onClick={() => resetGame()} className="text-blue-400 hover:text-blue-300 text-[8px] uppercase font-black tracking-widest py-1">Skip Word</button>
        )}
      </div>

      {showRules && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-b from-[#0f1f3c] to-[#0a1628] max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-500/30 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-900/90 to-cyan-900/50 border-b border-blue-500/30 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FaBook className="text-cyan-400 text-lg" />
                <h3 className="text-white font-black md:text-lg uppercase tracking-wider">{GAME_RULES.title}</h3>
              </div>
              <button onClick={() => setShowRules(false)} className="text-cyan-400 hover:text-red-400 transition-colors p-1"><FaTimes size={20} /></button>
            </div>

            {/* Rules Content */}
            <div className="p-4 space-y-4">
              {GAME_RULES.rules.map((rule, index) => (
                <div key={index} className="bg-blue-950/40 border border-blue-500/20 rounded-xl p-4 hover:border-blue-400/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                      <span className="text-[#0a1628] font-black text-sm">{rule.number}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-cyan-300 font-black uppercase tracking-wide text-sm mb-1">{rule.title}</h4>
                      <p className="text-blue-100 text-sm leading-relaxed">{rule.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-blue-500/30 bg-blue-950/30 p-4 flex gap-2">
              <button
                onClick={() => setShowRules(false)}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black py-2 rounded-lg uppercase text-sm hover:from-cyan-400 hover:to-blue-400 transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}