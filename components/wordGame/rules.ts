// Word Game Rules
export const GAME_RULES = {
  title: "Transport Trivia Rules",
  rules: [
    {
      number: 1,
      title: "Objective",
      description: "Guess the transport-related word by revealing its letters one at a time."
    },
    {
      number: 2,
      title: "How to Play",
      description: "Click on alphabet letters to guess. Each correct letter appears in the word. You have 6 wrong guesses allowed before the game ends."
    },
    {
      number: 3,
      title: "Scoring",
      description: "Earn points based on the difficulty multiplier (1x, 2x, or 3x) multiplied by the number of letters in the word. Higher multipliers = harder words = more points."
    },
    {
      number: 4,
      title: "Hints",
      description: "Start with 3 hints per session. Click the Hint button to reveal a random unguessed letter. Hints refill every 15 minutes or buy new hints for 5 points."
    },
    {
      number: 5,
      title: "Wrong Guesses",
      description: "Each incorrect guess costs one life (heart). You lose when you reach 6 wrong guesses. Plan your guesses carefully!"
    },
    {
      number: 6,
      title: "Game Over & Victory",
      description: "Guess the word correctly to earn points and move to the next word. If you run out of lives, click 'Try Again' to start a new round."
    },
    {
      number: 7,
      title: "Multipliers",
      description: "⭐ 1x (Blue) = Easy words, 2x (Purple) = Medium difficulty, 3x (Gold) = Hard words with maximum points."
    },
    {
      number: 8,
      title: "Word Pool",
      description: "After guessing 500+ words, the word pool resets. This prevents repetition and keeps the game fresh."
    }
  ]
};
