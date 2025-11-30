"use client";

import { useState, useEffect } from "react";

const WORDS = [
  "car",
  "driver",
  "taxi",
  "bus",
  "train",
  "plane",
  "cargo",
  "road",
  "ticket",
  "shipping",
];

export default function WordGuessGame() {
  const [word, setWord] = useState("");
  const [guessed, setGuessed] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [input, setInput] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  // Pick a random word when the component mounts or resets
  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(randomWord);
    setGuessed([]);
    setWrongGuesses(0);
    setInput("");
    setGameOver(false);
    setWin(false);
  };

  const handleGuess = () => {
    if (!input || gameOver) return;

    const letter = input.toLowerCase();

    if (!guessed.includes(letter)) {
      setGuessed([...guessed, letter]);
      if (!word.includes(letter)) {
        setWrongGuesses(prev => prev + 1);
        if (wrongGuesses + 1 >= 6) {
          setGameOver(true);
        }
      } else {
        // Check if all letters are guessed
        const allGuessed = word.split("").every(l => [...guessed, letter].includes(l));
        if (allGuessed) setWin(true);
      }
    }
    setInput("");
  };

  const renderWord = () =>
    word.split("").map((l, i) => (
      <span key={i} className="mx-1 text-2xl font-bold border-b-2 border-gray-400 w-8 inline-block text-center">
        {guessed.includes(l) || gameOver || win ? l : "_"}
      </span>
    ));

  return (
    <div className="max-w-md mx-auto p-18 bg-white rounded-2xl shadow-lg mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Word Guessing Game</h2>
      
      <div className="text-center mb-4">{renderWord()}</div>

      <div className="flex justify-center mb-4">
        <input
          type="text"
          maxLength={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          className="border rounded px-3 py-1 w-16 text-center text-lg"
          disabled={gameOver || win}
        />
        <button
          onClick={handleGuess}
          className="ml-2 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          disabled={gameOver || win}
        >
          Guess
        </button>
      </div>

      <div className="text-center mb-2">
        <span>Wrong guesses: {wrongGuesses} / 6</span>
      </div>

      {gameOver && (
        <p className="text-center text-red-600 font-semibold mb-2">
          Game Over! The word was: <span className="font-bold">{word}</span>
        </p>
      )}

      {win && (
        <p className="text-center text-green-600 font-semibold mb-2">
          Congratulations! You guessed the word!
        </p>
      )}

      <div className="flex justify-center">
        <button
          onClick={resetGame}
          className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
