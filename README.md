# Sudoku PWA

A Progressive Web App implementation of the classic Sudoku puzzle game. Play Sudoku anywhere, even offline, with a clean and modern interface.

## Features

- 🎮 Classic Sudoku gameplay
- 📱 PWA support for offline play and installation
- 🎯 Four difficulty levels: Easy, Medium, Hard, and Expert
- 🤖 AI solve assistant with step-by-step explanations
- 💾 Game state saving via URL sharing
- 🎯 Scoring system with:
  - Points for correct numbers
  - Time-based completion bonus
  - Penalty system for mistakes
- 🎨 Visual distinctions for:
  - Initial numbers
  - Player-entered numbers
  - AI-solved numbers
  - Incorrect entries
 
## Demo
Demo available at https://gunnarsteinn.github.io/sudoku/

## How to Play

1. Click "New Game" to start and select your difficulty level
2. Click any empty cell and enter a number from 1-9
3. Use the "Check" button to verify your solution
4. If stuck, use the "AI Solve" button to get help with one certain move
5. Share your game state with friends using the "Share" button

## Scoring System

- +10 points for each correct number
- -5 points penalty for each mistake
- Completion bonus based on difficulty:
  - Easy: 100 points
  - Medium: 200 points
  - Hard: 300 points
  - Expert: 500 points
- Time affects your final score
- Penalties reduce your completion bonus

## Development

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm (Comes with Node.js)

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd sudoku
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Build for production
```bash
npm run build
```

### Technologies Used

- Vite - Build tool and development server
- Progressive Web App (PWA) capabilities
- LocalStorage for game state persistence
- Modern JavaScript (ES6+)

## License

MIT License - Feel free to use this code for your own projects

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
