"use client";

import { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa"; // Ensure react-icons is installed

const WORDS = [
  "ambulance", "bicycle", "bulldozer", "caravan", "chariot", "closenet", "container", "corvette", "cruiser", "danfo",
  "ferryboat", "forklift", "freighter", "glider", "gondola", "gunboat", "helicopter", "hovercraft", "humvee", "icebreaker",
  "jetpack", "kayak", "keke", "limousine", "minibus", "monorail", "motorbike", "offroader", "outboard", "parachute",
  "pedicab", "pickup", "pontoon", "racecar", "rickshaw", "rowboat", "sailboat", "scooter", "seaplane", "sedan",
  "shuttle", "sidecar", "snowmobile", "spaceship", "speedboat", "steamboat", "subway", "tanker", "taxicab", "tractor",
  "trailer", "trawler", "tricycle", "trolley", "tugboat", "unicycle", "vessel", "warship", "yacht", "zeppelin",
  "accelerator", "airbag", "airfield", "airport", "airway", "alternator", "anchor", "asphalt", "axle", "backstay",
  "barrier", "beacon", "bearing", "bicycle", "blockade", "boulevard", "brake", "bridge", "bumper", "bypass",
  "cabin", "caboose", "canopy", "carburetor", "carpool", "carriage", "catapult", "chassis", "clutch", "cockpit",
  "concourse", "conveyer", "crankshaft", "crossing", "culvert", "cylinder", "dashboard", "deadbolt", "deck", "depot",
  "derail", "detour", "diesel", "diffuser", "dockyard", "drivebelt", "driveway", "engine", "exhaust", "fender",
  "flyover", "freeway", "fuel", "fuselage", "gearbox", "gridlock", "hangar", "headlight", "highway", "hubcap",
  "ignition", "interstate", "junction", "keyway", "laneway", "logistics", "lubricant", "manifold", "mileage", "motorway",
  "navigation", "overpass", "pavement", "piston", "platform", "propeller", "prow", "radiator", "railroad", "railway",
  "runway", "seatbelt", "shipyard", "sidewalk", "skyway", "sprocket", "steering", "suspension", "terminal", "throttle",
  "tire", "tollgate", "traffic", "transmission", "tread", "tunnel", "turbine", "turnpike", "undercarriage", "viaduct",
  "wheelbase", "windshield", "wing", "yard", "arrival", "boarding", "captain", "cargo", "chauffeur", "commute",
  "conductor", "delivery", "departure", "dispatch", "drifting", "fare", "flight", "freight", "garage", "hauling",
  "itinerary", "journey", "loading", "manifest", "mechanic", "milepost", "operator", "overtake", "passenger",
  "pilot", "pipeline", "port", "radar", "receipt", "reverse", "route", "schedule", "service", "shipment",
  "steering", "stowage", "steward", "terminal", "ticket", "toll", "tonnage", "touring", "tracking", "traffic",
  "transit", "transport", "traveler", "trip", "unloading", "utility", "vacancy", "voyage", "waybill"
];

export default function WordGuessGame({ onClose }: { onClose?: () => void }) {
  const [word, setWord] = useState("");
  const [guessed, setGuessed] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(randomWord);
    setGuessed([]);
    setWrongGuesses(0);
    setGameOver(false);
    setWin(false);
  };

  const handleKeyClick = (letter: string) => {
    if (gameOver || win || guessed.includes(letter)) return;

    const newGuessed = [...guessed, letter];
    setGuessed(newGuessed);

    if (!word.includes(letter)) {
      const newWrong = wrongGuesses + 1;
      setWrongGuesses(newWrong);
      if (newWrong >= 6) setGameOver(true);
    } else {
      const allGuessed = word.split("").every(l => newGuessed.includes(l));
      if (allGuessed) setWin(true);
    }
  };

  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

  return (
    <div className="relative w-full max-w-xl mx-auto p-5 bg-[#0a1628] rounded-lg md:rounded-[2rem] shadow-2xl border border-blue-500/20 text-white">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-6 text-blue-400 hover:text-red-400 transition-colors p-1"
      >
        <FaTimes size={20} />
      </button>

      <div className="text-center mb-4">
        <h2 className="text-lg md:text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent uppercase italic">
          Transport Trivia
        </h2>
        <p className="text-blue-400/60 text-[9px] uppercase font-bold tracking-widest">Nomo Fun & Games</p>
      </div>

      {/* Progress Bars */}
      <div className="flex justify-center gap-1 mb-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`h-1 w-7 rounded-full transition-all duration-700 ${i < wrongGuesses ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" : "bg-blue-900/40"
              }`}
          />
        ))}
      </div>

      {/* Word Slots */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-6">
        {word.split("").map((l, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className={`
              inline-block w-7 sm:w-9 h-10 sm:h-12 border-b-2 text-xl sm:text-2xl font-black text-center flex items-center justify-center transition-all duration-300
              ${guessed.includes(l) || gameOver ? "border-blue-400 text-white translate-y-[-2px]" : "border-blue-900/50 text-transparent"}
              ${gameOver && !guessed.includes(l) ? "border-red-500/50 !text-red-400" : ""}
            `}>
              {guessed.includes(l) || gameOver ? l.toUpperCase() : ""}
            </span>
          </div>
        ))}
      </div>

      {/* Neon Keyboard */}
      <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 mb-6">
        {alphabet.map((letter) => {
          const isGuessed = guessed.includes(letter);
          const isCorrect = isGuessed && word.includes(letter);
          const isWrong = isGuessed && !word.includes(letter);

          return (
            <button
              key={letter}
              onClick={() => handleKeyClick(letter)}
              disabled={gameOver || win || isGuessed}
              className={`
                h-9 sm:h-11 rounded-lg text-xs font-bold uppercase transition-all duration-200 border
                ${!isGuessed ? "bg-blue-950/40 border-blue-800/30 hover:bg-blue-800/40 text-blue-100" : ""}
                ${isCorrect ? "bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" : ""}
                ${isWrong ? "bg-[#050b18] border-transparent text-blue-900/20" : ""}
              `}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Feedback & Reset */}
      <div className="text-center min-h-[70px] flex flex-col items-center justify-center">
        {gameOver && (
          <div className="space-y-3">
            <p className="text-red-400 text-sm font-bold tracking-tight">GAME OVER! The word was {word.toUpperCase()}</p>
            <button onClick={resetGame} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-black hover:bg-blue-500 transition-all text-[10px] uppercase">Try Again</button>
          </div>
        )}
        {win && (
          <div className="space-y-3">
            <p className="text-cyan-400 text-sm font-bold tracking-tight">YOU NAILED IT! 🏆</p>
            <button onClick={resetGame} className="bg-white text-[#0a1628] px-8 py-2 rounded-xl font-black hover:scale-105 transition-all text-[10px] uppercase">Next Level</button>
          </div>
        )}
        {!gameOver && !win && (
          <button
            onClick={resetGame}
            className="text-blue-700 hover:text-blue-400 text-[9px] uppercase font-black tracking-[0.2em] transition-colors"
          >
            Skip Word
          </button>
        )}
      </div>
    </div>
  );
}