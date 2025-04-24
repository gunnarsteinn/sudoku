import './style.css'
import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = 'sudoku-game-v1';

// Scoring system
let currentScore = 0;
let startTime = null;
let difficulty = 'Medium';
const DIFFICULTY_SETTINGS = {
  Easy: { cellsToRemove: 30, baseScore: 100 },
  Medium: { cellsToRemove: 40, baseScore: 200 },
  Hard: { cellsToRemove: 50, baseScore: 300 },
  Expert: { cellsToRemove: 60, baseScore: 500 }
};

// Functions to handle URL state with encryption
function encodeBoard(board) {
  const boardString = board.flat().map(n => n || '0').join('');
  return CryptoJS.AES.encrypt(boardString, ENCRYPTION_KEY).toString();
}

function decodeBoard(encrypted) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
    const numbers = decrypted.split('').map(n => parseInt(n));
    const board = createEmptyBoard();
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        board[i][j] = numbers[i * 9 + j];
      }
    }
    return board;
  } catch (e) {
    console.error('Failed to decode board:', e);
    return createEmptyBoard();
  }
}

// Create difficulty selection modal
const modalHtml = `
  <div class="modal" id="difficulty-modal">
    <div class="modal-content">
      <h2>Select Difficulty</h2>
      <button class="difficulty-button" data-difficulty="Easy">Easy</button>
      <button class="difficulty-button" data-difficulty="Medium">Medium</button>
      <button class="difficulty-button" data-difficulty="Hard">Hard</button>
      <button class="difficulty-button" data-difficulty="Expert">Expert</button>
    </div>
  </div>
`;

// Create score display with penalties
const scoreHtml = `
  <div class="score-display">
    <div>Score: <span id="current-score">0</span></div>
    <div>Penalties: <span id="penalties">0</span></div>
    <div>Time: <span id="timer">00:00</span></div>
  </div>
`;

document.querySelector('#app').innerHTML = `
  <div class="sudoku-container">
    <h1>Sudoku</h1>
    ${scoreHtml}
    <div class="game-board"></div>
    <div class="controls">
      <div class="game-controls">
        <button id="new-game">New Game</button>
        <button id="check">Check Solution</button>
        <button id="share">Share Game</button>
        <button id="ai-solve">AI Solve</button>
      </div>
      <div id="ai-explanation">
        <div class="step-container">
          <div class="step-history"></div>
        </div>
        <div class="current-explanation"></div>
      </div>
    </div>
  </div>
  ${modalHtml}
`;

// Timer function
function updateTimer() {
  if (!startTime) return;
  const now = new Date();
  const timeDiff = Math.floor((now - startTime) / 1000);
  const minutes = Math.floor(timeDiff / 60).toString().padStart(2, '0');
  const seconds = (timeDiff % 60).toString().padStart(2, '0');
  document.querySelector('#timer').textContent = `${minutes}:${seconds}`;
}

setInterval(updateTimer, 1000);

// Calculate score based on difficulty and time
function calculateScore(baseScore, timeInSeconds) {
  const timeMultiplier = Math.max(0.1, 1 - (timeInSeconds / 3600)); // Reduces score over time, minimum 10%
  return Math.round(baseScore * timeMultiplier);
}

// Modify the AI explanation div structure
document.querySelector('#ai-explanation').innerHTML = `
  <div class="step-container">
    <div class="step-history"></div>
  </div>
  <div class="current-explanation"></div>
`

// Track the AI solving state
let workingBoard = null;
let isAISolving = false;
let solveHistory = [];

// Function to create a preview board
function createPreviewBoard(boardState, highlightCell) {
  const previewBoard = document.createElement('div');
  previewBoard.className = 'preview-board';
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = document.createElement('div');
      cell.className = 'preview-cell';
      if (boardState[i][j] !== 0) {
        cell.textContent = boardState[i][j];
        // Check if this is an initial number (was in the original board)
        const isInitial = solution && solution[i][j] === boardState[i][j];
        if (isInitial) {
          cell.classList.add('initial');
        }
        // Add highlight class for the newly added number
        if (highlightCell && highlightCell[0] === i && highlightCell[1] === j) {
          cell.classList.add('highlight');
        }
        // Add AI solved class for numbers added by AI
        if (!isInitial) {
          cell.classList.add('ai-solved');
        }
      }
      // Add position classes for 3x3 grid borders
      if (j === 2 || j === 5) cell.classList.add('border-right');
      if (i === 2 || i === 5) cell.classList.add('border-bottom');
      previewBoard.appendChild(cell);
    }
  }
  return previewBoard;
}

// Function to add a step to history
function addStepToHistory(explanation, boardState, highlightCell) {
  const stepHistory = document.querySelector('.step-history');
  const step = document.createElement('div');
  step.className = 'step';
  
  // Create short summary from explanation
  const firstLine = explanation.split('\n')[0];
  step.textContent = firstLine;
  
  // Create preview element
  const preview = document.createElement('div');
  preview.className = 'step-preview';
  preview.appendChild(createPreviewBoard(boardState, highlightCell));
  step.appendChild(preview);
  
  stepHistory.appendChild(step);
  stepHistory.scrollTop = stepHistory.scrollHeight;
  
  // Store in history
  solveHistory.push({
    explanation,
    boardState: boardState.map(row => [...row]),
    highlightCell
  });
}

// Initialize the game board
const gameBoard = document.querySelector('.game-board')
const board = createEmptyBoard()
let solution = null

// Try to load game from URL
const urlParams = new URLSearchParams(window.location.search)
const savedBoard = urlParams.get('board')
const savedSolution = urlParams.get('solution')

if (savedBoard && savedSolution) {
  Object.assign(board, decodeBoard(savedBoard))
  solution = decodeBoard(savedSolution)
  renderBoard(board)
} else {
  // Start new game if no saved state
  generateNewGame()
}

// Create empty 9x9 board
function createEmptyBoard() {
  return Array(9).fill().map(() => Array(9).fill(0))
}

// Generate a valid Sudoku puzzle
function generatePuzzle() {
  solution = generateSolution(createEmptyBoard());
  const puzzle = [...solution.map(row => [...row])];
  
  const cellsToRemove = DIFFICULTY_SETTINGS[difficulty].cellsToRemove;
  for (let i = 0; i < cellsToRemove; i++) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
    } else {
      i--;
    }
  }
  return puzzle;
}

// Generate a new game and update URL
function generateNewGame() {
  const puzzle = generatePuzzle();
  Object.assign(board, puzzle);
  renderBoard(board);
  updateURL(board, solution);
  
  // Reset score, penalties and timer
  currentScore = 0;
  penalties = 0;
  startTime = new Date();
  document.querySelector('#current-score').textContent = '0';
  document.querySelector('#penalties').textContent = '0';
}

// Generate a complete valid solution
function generateSolution(board) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        // Shuffle numbers for randomization
        const shuffled = [...numbers].sort(() => Math.random() - 0.5)
        
        for (let num of shuffled) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num
            if (col === 8 && row === 8) return board
            
            if (generateSolution(board)) {
              return board
            }
          }
        }
        board[row][col] = 0
        return false
      }
    }
  }
  return board
}

// Check if a number is valid in the given position
function isValid(board, row, col, num) {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false
  }
  
  // Check column
  for (let x = 0; x < 9; x++) {
    if (board[x][col] === num) return false
  }
  
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[boxRow + i][boxCol + j] === num) return false
    }
  }
  
  return true
}

// Initialize penalties
let penalties = 0;

// Render the board to DOM with improved cell classes
function renderBoard(board) {
  gameBoard.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      const cell = document.createElement('input');
      cell.type = 'number';
      cell.min = 1;
      cell.max = 9;
      cell.value = board[i][j] || '';
      cell.dataset.row = i;
      cell.dataset.col = j;
      
      if (board[i][j] !== 0) {
        cell.readOnly = true;
        if (solution && board[i][j] === solution[i][j]) {
          cell.classList.add('preset'); // Initial puzzle numbers
        } else if (workingBoard && workingBoard[i][j] === board[i][j]) {
          cell.classList.add('ai-solved'); // AI solved numbers
        } else {
          cell.classList.add('human'); // Human entered numbers
        }
      }
      
      cell.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 0;
        const oldValue = board[i][j];
        board[i][j] = value;
        
        // Remove any existing mistake class
        e.target.classList.remove('mistake');
        
        if (value !== 0) {
          if (solution && value === solution[i][j]) {
            // Correct number
            currentScore += 10;
            document.querySelector('#current-score').textContent = currentScore;
            e.target.classList.add('human');
          } else if (solution && value !== solution[i][j]) {
            // Wrong number - add penalty
            penalties += 1;
            currentScore = Math.max(0, currentScore - 5); // Deduct 5 points, minimum 0
            document.querySelector('#current-score').textContent = currentScore;
            document.querySelector('#penalties').textContent = penalties;
            e.target.classList.add('mistake');
            // Shake animation will play due to the mistake class
            e.target.classList.remove('human');
            // Reset the animation to make it play again if it's already a mistake
            e.target.style.animation = 'none';
            e.target.offsetHeight; // Trigger reflow
            e.target.style.animation = null;
          }
        }
        
        updateURL(board, solution);
      });
      
      gameBoard.appendChild(cell);
    }
  }
}

// Check if the current board matches the solution
function checkSolution(currentBoard) {
  if (!solution) return false
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (currentBoard[i][j] !== solution[i][j]) {
        return false
      }
    }
  }
  return true
}

// Function to find the next empty cell
function findEmptyCell(board) {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        return [row, col];
      }
    }
  }
  return null;
}

// Function to find possible values for a cell
function findPossibleValues(board, row, col) {
  const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  // Check row
  for (let x = 0; x < 9; x++) {
    possible.delete(board[row][x]);
  }
  
  // Check column
  for (let x = 0; x < 9; x++) {
    possible.delete(board[x][col]);
  }
  
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      possible.delete(board[boxRow + i][boxCol + j]);
    }
  }
  
  return Array.from(possible);
}

// Function to explain why a number is valid in a cell
function explainMove(board, row, col, num) {
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  
  let explanation = `Placing ${num} at position (${row + 1}, ${col + 1}) because:\n`;
  explanation += `1. Row ${row + 1} doesn't contain ${num}\n`;
  explanation += `2. Column ${col + 1} doesn't contain ${num}\n`;
  explanation += `3. The 3x3 box at position (${boxRow + 1}-${boxRow + 3}, ${boxCol + 1}-${boxCol + 3}) doesn't contain ${num}\n`;
  
  const possibleValues = findPossibleValues(board, row, col);
  explanation += `4. Possible values for this cell: ${possibleValues.join(', ')}\n`;
  
  if (possibleValues.length === 1) {
    explanation += '5. This is the only possible value for this cell!\n';
  }
  
  return explanation;
}

// Modified AI solve function to do one step at a time and only place certain numbers
async function aiSolve() {
  const solveButton = document.querySelector('#ai-solve');
  const explanationDiv = document.querySelector('.current-explanation');
  
  // Initialize solving state if not started
  if (!isAISolving) {
    isAISolving = true;
    workingBoard = board.map(row => [...row]);
    solveHistory = [];
    document.querySelector('.step-history').innerHTML = '';
  }

  // Find a cell where we are certain of the value
  let certainCell = null;
  let certainValue = null;
  let cellExplanation = '';

  // Look through all empty cells to find one with only one possible value
  for (let row = 0; row < 9 && !certainCell; row++) {
    for (let col = 0; col < 9 && !certainCell; col++) {
      if (workingBoard[row][col] === 0) {
        const possibleValues = findPossibleValues(workingBoard, row, col);
        if (possibleValues.length === 1) {
          certainCell = [row, col];
          certainValue = possibleValues[0];
          cellExplanation = explainMove(workingBoard, row, col, certainValue);
        }
      }
    }
  }

  if (!certainCell) {
    explanationDiv.innerHTML = '<strong>No certain moves available!</strong><br>All empty cells have multiple possibilities.';
    // Don't set isAISolving to false - there might be certain moves after the user fills in more numbers
    return;
  }

  const [row, col] = certainCell;
  
  // Update the boards
  workingBoard[row][col] = certainValue;
  board[row][col] = certainValue;
  
  // Display explanation and update UI
  explanationDiv.innerHTML = '<pre>' + cellExplanation + '</pre>';
  addStepToHistory(cellExplanation, workingBoard, [row, col]);
  
  // Mark the cell as AI-solved and render the board
  renderBoard(board);
  
  updateURL(board, solution);

  // Check if the puzzle is complete
  const emptyCell = findEmptyCell(workingBoard);
  if (!emptyCell) {
    explanationDiv.innerHTML += '<br><strong>Puzzle solved using only certain moves!</strong>';
    isAISolving = false;
  }
}

// Event listeners
document.querySelector('#new-game').addEventListener('click', () => {
  document.querySelector('#difficulty-modal').classList.add('show');
});

// Difficulty selection
document.querySelectorAll('.difficulty-button').forEach(button => {
  button.addEventListener('click', () => {
    difficulty = button.dataset.difficulty;
    document.querySelector('#difficulty-modal').classList.remove('show');
    isAISolving = false;
    workingBoard = null;
    generateNewGame();
  });
});

document.querySelector('#check').addEventListener('click', () => {
  const isCorrect = checkSolution(board);
  if (isCorrect) {
    const endTime = new Date();
    const timeInSeconds = Math.floor((endTime - startTime) / 1000);
    const finalScore = calculateScore(DIFFICULTY_SETTINGS[difficulty].baseScore, timeInSeconds);
    // Apply penalty multiplier to final score
    const penaltyMultiplier = Math.max(0.1, 1 - (penalties * 0.1)); // Each penalty reduces score by 10%, minimum 10% of score
    const penalizedScore = Math.round(finalScore * penaltyMultiplier);
    currentScore += penalizedScore;
    document.querySelector('#current-score').textContent = currentScore;
    alert(`Congratulations! You solved the puzzle!\nTime: ${Math.floor(timeInSeconds / 60)}:${(timeInSeconds % 60).toString().padStart(2, '0')}\nPenalties: ${penalties}\nPenalty Multiplier: ${(penaltyMultiplier * 100).toFixed(0)}%\nFinal Score: ${currentScore}`);
  } else {
    alert('The solution is not correct. Keep trying!');
  }
});

document.querySelector('#share').addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href)
  alert('Game URL copied to clipboard! Share it with your friends.')
})

// Add event listener for AI solve button
document.querySelector('#ai-solve').addEventListener('click', aiSolve)

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.log('Service worker registration failed:', error)
    })
  })
}
