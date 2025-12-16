# Chess Master Pro ♟️

A **premium-quality, industry-grade chess game** built from scratch with React, TypeScript, and HTML5 Canvas. Features a custom-built chess engine with no external chess libraries.

![Chess Master Pro](https://img.shields.io/badge/Chess-Master%20Pro-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-18.2-blue?style=flat-square&logo=react)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

## ✨ Features

### Game Modes
- **Pass & Play**: Play against a friend on the same device
- **vs Computer**: Challenge the AI with 5 difficulty levels

### AI Engine
- **Custom-built chess engine** - No external chess libraries
- **Alpha-Beta pruning** with iterative deepening
- **Transposition tables** with Zobrist hashing
- **Move ordering** with MVV-LVA, killer moves, and history heuristic
- **Quiescence search** to avoid horizon effect
- **Human-like behavior** with configurable mistake probability

### Difficulty Levels
| Level | Description | Depth | Time |
|-------|-------------|-------|------|
| 🌱 Beginner | Learning the basics | 2 | 500ms |
| 🎮 Easy | Casual play | 3 | 1s |
| ⚡ Medium | Moderate challenge | 4 | 2s |
| 🔥 Hard | Strong opponent | 5 | 4s |
| 👑 Expert | Maximum strength | 6 | 6s |

### User Interface
- **Canvas-based board** with smooth rendering
- **Drag-and-drop** and click-to-move piece movement
- **Legal move highlighting**
- **Last move indicator**
- **Check highlighting**
- **Move history** with navigation
- **AI analysis panel** with evaluation bar
- **Dark/Light theme** toggle
- **Board flip** option
- **Responsive design** - works on desktop and mobile

### Technical Features
- **Web Worker** - Engine runs in separate thread for smooth UI
- **TypeScript** with strict mode
- **Zero external chess dependencies**
- **Perft-verified** move generation
- **FEN support** for position import/export

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd CHESSGAME

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to play!

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## 🎮 How to Play

1. **Start a game**: Choose your game mode and settings, then click "Start Game"
2. **Move pieces**: Click on a piece to select it, then click on a highlighted square to move
3. **Drag & Drop**: Alternatively, drag pieces to their destination
4. **Undo/Redo**: Use the toolbar buttons or Ctrl+Z / Ctrl+Y
5. **Flip board**: Press F or use the flip button to change perspective

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `F` | Flip board |
| `Ctrl+Z` | Undo move |
| `Ctrl+Y` | Redo move |
| `Ctrl+N` | New game |

## 🏗️ Project Structure

```
CHESSGAME/
├── src/
│   ├── engine/                 # Chess engine core
│   │   ├── board/              # Board representation
│   │   │   ├── constants.ts    # Board constants, square utilities
│   │   │   ├── utils.ts        # Board manipulation functions
│   │   │   └── fen.ts          # FEN parsing and generation
│   │   ├── moves/              # Move generation
│   │   │   ├── generator.ts    # Legal move generation
│   │   │   └── notation.ts     # SAN/coordinate notation
│   │   ├── evaluation/         # Position evaluation
│   │   │   └── evaluate.ts     # Piece-square tables, scoring
│   │   ├── search/             # Search algorithms
│   │   │   ├── zobrist.ts      # Zobrist hashing
│   │   │   ├── transposition.ts# Transposition table
│   │   │   ├── ordering.ts     # Move ordering heuristics
│   │   │   └── search.ts       # Alpha-beta search
│   │   └── ai/                 # AI personality
│   │       └── difficulty.ts   # Difficulty levels
│   ├── game/                   # Game state management
│   │   └── GameController.ts   # Central game controller
│   ├── worker/                 # Web Worker integration
│   │   ├── engine.worker.ts    # Worker entry point
│   │   └── engineWrapper.ts    # Promise-based wrapper
│   ├── ui/                     # React UI components
│   │   ├── components/         # React components
│   │   │   ├── ChessBoard.tsx  # Canvas board component
│   │   │   ├── StatusBar.tsx   # Game status display
│   │   │   ├── MoveHistory.tsx # Move list with navigation
│   │   │   ├── AIAnalysis.tsx  # Engine analysis panel
│   │   │   └── Settings.tsx    # Game settings panel
│   │   ├── hooks/              # React hooks
│   │   ├── styles/             # CSS styles
│   │   └── App.tsx             # Main application
│   ├── types/                  # TypeScript type definitions
│   ├── tests/                  # Test files
│   └── main.tsx                # Application entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- **Move generation tests** - All piece movements, special moves
- **Perft tests** - Verify move generation accuracy
- **FEN tests** - Parsing and generation
- **Evaluation tests** - Material and positional scoring
- **Search tests** - Tactical positions, mate finding

## 🔧 Technical Details

### Chess Engine Architecture

#### Board Representation
- 64-element array (a1=0, h8=63)
- Null for empty squares, Piece objects for occupied
- Full position state including castling, en passant, clocks

#### Move Generation
- Pseudo-legal move generation with legality filtering
- Special move handling: castling, en passant, promotion
- Attack detection for check/checkmate

#### Search Algorithm
```
Alpha-Beta with Iterative Deepening
├── Transposition Table (Zobrist hashing)
├── Move Ordering
│   ├── Hash move (from TT)
│   ├── Captures (MVV-LVA)
│   ├── Killer moves
│   └── History heuristic
├── Quiescence Search
└── Time Management
```

#### Evaluation Function
- Material counting (standard piece values)
- Piece-square tables (position-based bonuses)
- Mobility scoring
- King safety
- Pawn structure analysis
- Center control

### Performance Optimizations
- Zobrist hashing for fast position comparison
- Transposition table with replacement strategy
- Move ordering to maximize alpha-beta cutoffs
- Iterative deepening for time management
- Web Worker for non-blocking UI

## 📝 API Reference

### GameController

```typescript
const controller = new GameController();

// Start a new game
controller.startNewGame(GameMode.VS_COMPUTER, DifficultyLevel.MEDIUM, Color.WHITE);

// Make a move
controller.makeMove(move);

// Undo/Redo
controller.undo();
controller.redo();

// Subscribe to state changes
controller.subscribe(callback);
```

### Position Format (FEN)

```typescript
import { parseFEN, positionToFEN } from './engine/board/fen';

const position = parseFEN('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
const fen = positionToFEN(position);
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Chess piece SVG designs inspired by standard Staunton pieces
- Perft test positions from the chess programming wiki
- Piece-square table values adapted from Tomasz Michniewski's work

---

**Built with ❤️ using React + TypeScript + HTML5 Canvas**
