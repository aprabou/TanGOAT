# DIY Guide: Building a LinkedIn Tango Puzzle Solver Extension

This is a comprehensive technical guide for building a Chrome extension that automatically solves LinkedIn's Tango puzzle game. This document provides complete implementation details that any engineer can follow to replicate the system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Chrome Extension Foundation](#chrome-extension-foundation)
3. [LinkedIn DOM Structure Analysis](#linkedin-dom-structure-analysis)
4. [Board State Parsing](#board-state-parsing)
5. [Constraint Detection](#constraint-detection)
6. [Solving Algorithm](#solving-algorithm)
7. [Cell Interaction System](#cell-interaction-system)
8. [Error Handling & Edge Cases](#error-handling--edge-cases)
9. [Complete Code Implementation](#complete-code-implementation)

---

## Architecture Overview

The extension consists of 4 main components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Extension     │────│   Content       │────│   Solver        │
│   Popup (UI)    │    │   Script        │    │   Engine        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User clicks     │    │ DOM Analysis    │    │ DFS Algorithm   │
│ "Solve Puzzle"  │    │ & Interaction   │    │ with Rules      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow:
1. **User Input**: Clicks extension popup button
2. **Content Script**: Analyzes LinkedIn's DOM structure
3. **Solver Engine**: Processes board state and finds solution
4. **Cell Interaction**: Automatically clicks LinkedIn cells to input solution

---

## Chrome Extension Foundation

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "LinkedIn Tango Solver",
  "version": "1.0",
  "permissions": ["activeTab", "scripting"],
  "content_scripts": [{
    "matches": [
      "*://www.linkedin.com/games/tango*",
      "*://linkedin.com/games/tango*",
      "*://www.linkedin.com/games/*",
      "*://linkedin.com/games/*"
    ],
    "js": ["solver.js", "content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_title": "LinkedIn Tango Solver"
  }
}
```

### Key Extension Concepts:

**Content Scripts**: Run in the context of web pages and can access/modify the DOM
**Background/Popup Scripts**: Handle user interface and communicate with content scripts
**Permissions**: `activeTab` allows access to current tab, `scripting` enables dynamic script injection

---

## LinkedIn DOM Structure Analysis

### Game Board Hierarchy

LinkedIn's Tango game uses this DOM structure:

```html
<div class="lotka-board grid-board">
  <div class="lotka-grid" style="--rows: 6; --cols: 6;">
    <div class="lotka-cell" data-cell-idx="0" id="lotka-cell-0">
      <div class="lotka-cell-content">
        <!-- Cell content: Sun, Moon, or Empty -->
        <svg aria-label="Sun" class="lotka-cell-content-img">
          <path class="lotka-cell-zero-path" />
        </svg>
      </div>
      <!-- Constraint edges (if present) -->
      <div class="lotka-cell-edge lotka-cell-edge--right">
        <svg aria-label="Equal"> <!-- or "Cross" -->
      </div>
    </div>
    <!-- More cells... -->
  </div>
</div>
```

### Critical Selectors:

1. **Board Container**: `.lotka-grid`
2. **Individual Cells**: `.lotka-cell`
3. **Cell Content**: `.lotka-cell-content svg[aria-label]`
4. **Constraint Edges**: `.lotka-cell-edge`

### Cell State Identification:

```javascript
// Empty Cell
<svg class="lotka-cell-empty" aria-label="Empty">

// Sun Cell (Locked or Filled)
<svg aria-label="Sun" class="lotka-cell-content-img">
  <path class="lotka-cell-zero-path" />

// Moon Cell (Locked or Filled)
<svg aria-label="Moon" class="lotka-cell-content-img">
  <path class="lotka-cell-one-path" />
```

### Constraint Edge Detection:

```javascript
// Equal Constraint (=)
<div class="lotka-cell-edge lotka-cell-edge--right">
  <svg aria-label="Equal">
    <path id="=" />

// Opposite Constraint (X)
<div class="lotka-cell-edge lotka-cell-edge--down">
  <svg aria-label="Cross">
    <path class="lotka-edge-sign-path" />
```

---

## Board State Parsing

### Dynamic Board Size Detection

```javascript
async initialize() {
  // Wait for board to load
  let board = null;
  const startTime = Date.now();
  while (Date.now() - startTime < 5000) {
    board = document.querySelector('.lotka-grid');
    if (board) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Detect board size from CSS variables or cell count
  const cellCount = document.querySelectorAll('.lotka-cell').length;
  BOARD_SIZE = Math.sqrt(cellCount); // Usually 6 for 6x6 grid
  EDGE_SIZE = BOARD_SIZE - 1;
}
```

### Board State Data Structure

```javascript
const gameState = {
  board: Array(BOARD_SIZE).fill().map(() =>
    Array(BOARD_SIZE).fill().map(() => ({
      contains: CellState.EMPTY
    }))
  ),
  edges: {
    horizontal: Array(BOARD_SIZE).fill().map(() =>
      Array(EDGE_SIZE).fill().map(() => ({
        state: EdgeState.EMPTY
      }))
    ),
    vertical: Array(EDGE_SIZE).fill().map(() =>
      Array(BOARD_SIZE).fill().map(() => ({
        state: EdgeState.EMPTY
      }))
    )
  }
};
```

### Cell Parsing Algorithm

```javascript
async parseBoardState() {
  const cells = document.querySelectorAll('.lotka-cell');
  const cells2D = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));

  // Convert linear cell list to 2D array
  cells.forEach((cell, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    cells2D[row][col] = cell;
  });

  // Parse each cell's state and constraints
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const cell = cells2D[row][col];

      // Parse cell content
      if (cell.querySelector('.lotka-cell-content .lotka-cell-empty')) {
        state.board[row][col].contains = CellState.EMPTY;
      } else if (cell.querySelector('#Moon') || cell.querySelector('svg[aria-label="Moon"]')) {
        state.board[row][col].contains = CellState.MOON;
      } else if (cell.querySelector('#Sun') || cell.querySelector('svg[aria-label="Sun"]')) {
        state.board[row][col].contains = CellState.SUN;
      }

      // Parse constraint edges
      this.parseConstraintEdges(cell, row, col, state);
    }
  }

  return state;
}
```

---

## Constraint Detection

### Edge Constraint System

LinkedIn uses a sophisticated edge system where constraints exist between adjacent cells:

- **Horizontal Edges**: `edges.horizontal[row][col]` connects cell `(row,col)` to `(row,col+1)`
- **Vertical Edges**: `edges.vertical[row][col]` connects cell `(row,col)` to `(row+1,col)`

### Constraint Parsing Implementation

```javascript
parseConstraintEdges(cell, row, col, state) {
  // Parse right edge (horizontal constraint)
  const rightEdge = cell.querySelector('.lotka-cell-edge.lotka-cell-edge--right');
  if (rightEdge && col < EDGE_SIZE) {
    const svg = rightEdge.querySelector('svg');
    if (svg) {
      const label = svg.getAttribute('aria-label');
      state.edges.horizontal[row][col].state =
        label === 'Cross' ? EdgeState.OPPOSITE : EdgeState.EQUAL;
    }
  }

  // Parse bottom edge (vertical constraint)
  const bottomEdge = cell.querySelector('.lotka-cell-edge.lotka-cell-edge--down');
  if (bottomEdge && row < EDGE_SIZE) {
    const svg = bottomEdge.querySelector('svg');
    if (svg) {
      const label = svg.getAttribute('aria-label');
      state.edges.vertical[row][col].state =
        label === 'Cross' ? EdgeState.OPPOSITE : EdgeState.EQUAL;
    }
  }
}
```

---

## Solving Algorithm

### Rule-Based Constraint Validation

The solver uses a comprehensive validation system that checks all Tango rules:

```javascript
isValidPlacement(row, col, symbol) {
  // Rule 1: No three-in-a-row (horizontal)
  if (this.checkThreeInRowHorizontal(row, col, symbol)) return false;

  // Rule 2: No three-in-a-row (vertical)
  if (this.checkThreeInRowVertical(row, col, symbol)) return false;

  // Rule 3: Row/column balance (equal Sun/Moon counts)
  if (this.checkRowColumnBalance(row, col, symbol)) return false;

  // Rule 4: Edge constraint satisfaction
  if (this.checkEdgeConstraints(row, col, symbol)) return false;

  return true;
}
```

### Three-in-a-Row Detection

```javascript
checkThreeInRowHorizontal(row, col, symbol) {
  // Check if placing symbol would create three-in-a-row horizontally

  // Pattern: XX_  (two left, placing right)
  if (col >= 2) {
    if (this.board[row][col - 1].contains === symbol &&
        this.board[row][col - 2].contains === symbol) {
      return true;
    }
  }

  // Pattern: _XX  (placing left, two right)
  if (col <= BOARD_SIZE - 3) {
    if (this.board[row][col + 1].contains === symbol &&
        this.board[row][col + 2].contains === symbol) {
      return true;
    }
  }

  // Pattern: X_X  (one left, placing middle, one right)
  if (col > 0 && col < BOARD_SIZE - 1) {
    if (this.board[row][col - 1].contains === symbol &&
        this.board[row][col + 1].contains === symbol) {
      return true;
    }
  }

  return false;
}
```

### Edge Constraint Validation

```javascript
checkEdgeConstraints(row, col, symbol) {
  // Check horizontal edge constraints
  if (col < EDGE_SIZE) {
    const edge = this.edges.horizontal[row][col];
    const rightCell = this.board[row][col + 1].contains;

    if (edge.state === EdgeState.EQUAL &&
        rightCell !== CellState.EMPTY && rightCell !== symbol) {
      return true; // Violation: equal constraint but different symbols
    }

    if (edge.state === EdgeState.OPPOSITE &&
        rightCell !== CellState.EMPTY && rightCell === symbol) {
      return true; // Violation: opposite constraint but same symbols
    }
  }

  // Check vertical edge constraints (similar logic)
  // ... vertical edge checking code

  return false;
}
```

### DFS Solving Algorithm

```javascript
solvePuzzle() {
  // Find all empty cells
  const emptyCells = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (this.board[row][col].contains === CellState.EMPTY) {
        emptyCells.push([row, col]);
      }
    }
  }

  // Sort by heuristic: cells with fewer adjacent empty cells first
  emptyCells.sort((a, b) => {
    const aAdjacent = this.getAdjacentEmptyCells(a[0], a[1]).length;
    const bAdjacent = this.getAdjacentEmptyCells(b[0], b[1]).length;
    return aAdjacent - bAdjacent;
  });

  const solution = [];

  const dfs = (index) => {
    if (index === emptyCells.length) return true; // All cells filled

    const [row, col] = emptyCells[index];

    // Try Moon first
    if (this.isValidPlacement(row, col, CellState.MOON)) {
      this.board[row][col].contains = CellState.MOON;
      solution.push([row, col, CellState.MOON]);

      if (dfs(index + 1)) return true;

      // Backtrack
      solution.pop();
      this.board[row][col].contains = CellState.EMPTY;
    }

    // Try Sun
    if (this.isValidPlacement(row, col, CellState.SUN)) {
      this.board[row][col].contains = CellState.SUN;
      solution.push([row, col, CellState.SUN]);

      if (dfs(index + 1)) return true;

      // Backtrack
      solution.pop();
      this.board[row][col].contains = CellState.EMPTY;
    }

    return false; // No valid placement found
  };

  return dfs(0) ? solution : null;
}
```

---

## Cell Interaction System

### LinkedIn Cell Interaction Pattern

LinkedIn's Tango game uses a specific click pattern:
- **Single Click** → Places Sun ☀️
- **Double Click** → Places Moon 🌙
- **Triple Click** → Clears cell (back to empty)

### Cell Clicking Implementation

```javascript
async inputSolution(solution) {
  // Filter out pre-filled cells
  const newPlacements = solution.filter(([row, col, symbol]) =>
    this.baseGameState.board[row][col].contains === CellState.EMPTY
  );

  // Sort placements by position (row, then column)
  newPlacements.sort(([rowA, colA], [rowB, colB]) => {
    if (rowA !== rowB) return rowA - rowB;
    return colA - colB;
  });

  for (const [row, col, symbol] of newPlacements) {
    const cellIndex = row * BOARD_SIZE + col;
    const cell = document.querySelector(`#lotka-cell-${cellIndex}`);

    if (cell && !cell.classList.contains('lotka-cell--locked')) {
      if (symbol === CellState.SUN) {
        await this.singleClick(cell);
      } else if (symbol === CellState.MOON) {
        await this.doubleClick(cell);
      }

      // Wait between placements for stability
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return true;
}
```

### Mouse Event Simulation

```javascript
createMouseEvent(type) {
  return new MouseEvent(type, {
    view: window,
    bubbles: true,
    cancelable: true,
    buttons: 1
  });
}

async singleClick(cell) {
  cell.dispatchEvent(this.createMouseEvent('mousedown'));
  await new Promise(resolve => setTimeout(resolve, 10));
  cell.dispatchEvent(this.createMouseEvent('mouseup'));
  cell.dispatchEvent(this.createMouseEvent('click'));
}

async doubleClick(cell) {
  // First click
  await this.singleClick(cell);
  await new Promise(resolve => setTimeout(resolve, 10));

  // Second click
  await this.singleClick(cell);
}
```

---

## Error Handling & Edge Cases

### DOM Loading Race Conditions

```javascript
async waitForGameBoard(timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const board = document.querySelector('.lotka-grid');
    if (board) {
      // Additional check: ensure cells are loaded
      const cellCount = document.querySelectorAll('.lotka-cell').length;
      if (cellCount > 0) return board;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Game board not found within timeout');
}
```

### Content Script Injection Handling

```javascript
// Prevent duplicate script loading
if (typeof window.TangoSolver === 'undefined') {
  // ... solver code
  window.TangoSolver = TangoSolver;
}

// Prevent duplicate initialization
if (!window.tangoIntegrationInstance) {
  window.tangoIntegrationInstance = new LinkedInTangoIntegration();
}
```

### Popup-Content Script Communication

```javascript
// Popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ success: true, status: 'loaded' });
  } else if (request.action === 'solve') {
    this.solvePuzzle().then(() => {
      sendResponse({ success: true });
    });
  }
  return true; // Keep message channel open for async response
});
```

### LinkedIn DOM Changes

```javascript
// Monitor for dynamic DOM changes
observeGameChanges() {
  const observer = new MutationObserver((mutations) => {
    let shouldRedetect = false;

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE &&
              node.querySelector &&
              node.querySelector('.lotka-grid')) {
            shouldRedetect = true;
          }
        });
      }
    });

    if (shouldRedetect) {
      setTimeout(() => this.reinitialize(), 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
```

---

## Complete Code Implementation

### File Structure
```
TanGOAT/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.js               # Popup interaction logic
├── content.js             # Main content script
├── solver.js              # Core solving algorithm
├── styles.css             # UI styling
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Key Implementation Files

**manifest.json**: Already provided above

**solver.js**: Core algorithm (300+ lines)
- TangoSolver class with DFS algorithm
- Constraint validation methods
- Board state management
- LinkedIn cell interaction

**content.js**: DOM integration (200+ lines)
- LinkedInTangoIntegration class
- DOM parsing and monitoring
- Message handling with popup
- Error handling and recovery

**popup.js**: User interface (100+ lines)
- Button event handlers
- Chrome API communication
- Script injection handling
- Status feedback system

### Critical Implementation Details

1. **Timing**: All DOM interactions include proper delays to ensure LinkedIn's JavaScript processes changes
2. **Robustness**: Multiple fallback selectors handle LinkedIn UI changes
3. **Performance**: Smart heuristics reduce search space significantly
4. **Compatibility**: Handles both locked (pre-filled) and interactive cells
5. **Debugging**: Comprehensive console logging for troubleshooting

### Testing Strategy

1. **Unit Testing**: Validate constraint detection on known puzzle configurations
2. **Integration Testing**: Test full solve cycle on multiple LinkedIn Tango puzzles
3. **Error Testing**: Verify graceful handling of DOM changes and network delays
4. **Performance Testing**: Measure solve times on various puzzle complexities

---

## Advanced Implementation Considerations

### Memory Management
- Clean up DOM observers when extension is disabled
- Proper cleanup of event listeners
- Avoid memory leaks in long-running content scripts

### Security Considerations
- Content Security Policy compliance
- Safe DOM manipulation practices
- Input validation for all parsed data

### Performance Optimization
- Lazy loading of solver algorithm
- Caching of DOM queries where possible
- Efficient constraint checking order

### Extensibility
- Modular solver design for different puzzle types
- Configurable solving strategies
- Plugin architecture for new game variations

---

This guide provides complete implementation details for building a LinkedIn Tango puzzle solver. Any competent engineer should be able to replicate this system using the provided algorithms, DOM analysis techniques, and implementation patterns.

The key to success is understanding LinkedIn's specific DOM structure, implementing robust constraint validation, and using proper Chrome extension APIs for seamless integration.