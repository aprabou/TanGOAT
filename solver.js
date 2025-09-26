// Prevent duplicate class declarations
if (typeof window.TangoSolver === 'undefined') {

// Board dimensions - will be updated dynamically
let BOARD_SIZE = 6;
let EDGE_SIZE = BOARD_SIZE - 1;

// Cell and Edge States
const CellState = {
    EMPTY: 'empty',
    MOON: 'moon',
    SUN: 'sun'
};

const EdgeState = {
    EMPTY: 'empty',
    EQUAL: 'equal',
    OPPOSITE: 'opposite'
};

class TangoSolver {
    constructor() {
        this.baseGameState = {
            board: null,
            edges: null
        };
        this.simulatedGameState = {
            board: null,
            edges: null
        };
        this.shouldStop = false;
    }

    stopSolving() {
        this.shouldStop = true;
    }

    async initialize() {
        // Wait for board to appear
        // 100ms polling interval w/ 5-second max wait to prevent race conditions
        let board = null;
        const startTime = Date.now();
        while (Date.now() - startTime < 5000) {
            board = document.querySelector('.lotka-grid');
            if (board) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!board) {
            throw new Error('Board not found after initialization');
        }

        // Detect board size and update global variables
        const cellCount = document.querySelectorAll('.lotka-cell').length;
        BOARD_SIZE = Math.sqrt(cellCount);
        EDGE_SIZE = BOARD_SIZE - 1;

        console.log(`Detected ${BOARD_SIZE}x${BOARD_SIZE} board with ${cellCount} cells`);

        // Initialize game state with correct dimensions
        this.baseGameState = {
            board: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill().map(() => ({ contains: CellState.EMPTY }))),
            edges: {
                horizontal: Array(BOARD_SIZE).fill().map(() => Array(EDGE_SIZE).fill().map(() => ({ state: EdgeState.EMPTY }))),
                vertical: Array(EDGE_SIZE).fill().map(() => Array(BOARD_SIZE).fill().map(() => ({ state: EdgeState.EMPTY })))
            }
        };
        this.simulatedGameState.board = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill().map(() => ({ contains: CellState.EMPTY })));
        this.simulatedGameState.edges = this.baseGameState.edges;
    }

    async parseBoardState() {
        const state = {
            board: Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill().map(() => ({ contains: CellState.EMPTY }))),
            edges: {
                horizontal: Array(BOARD_SIZE).fill().map(() => Array(EDGE_SIZE).fill().map(() => ({ state: EdgeState.EMPTY }))),
                vertical: Array(EDGE_SIZE).fill().map(() => Array(BOARD_SIZE).fill().map(() => ({ state: EdgeState.EMPTY })))
            }
        };

        // Get all cells and convert to 2D array
        const cells = document.querySelectorAll('.lotka-cell');
        const cells2D = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(null));

        cells.forEach((cell, index) => {
            const row = Math.floor(index / BOARD_SIZE);
            const col = index % BOARD_SIZE;
            cells2D[row][col] = cell;
        });

        // Parse cells and edges using 2D array
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = cells2D[row][col];
                if (!cell) continue;

                // Parse cell content - LinkedIn specific
                if (cell.querySelector('.lotka-cell-content .lotka-cell-empty')) {
                    state.board[row][col].contains = CellState.EMPTY;
                } else if (cell.querySelector('.lotka-cell-content #Moon') ||
                          cell.querySelector('svg[aria-label="Moon"]') ||
                          cell.querySelector('.lotka-cell-one-path')) {
                    state.board[row][col].contains = CellState.MOON;
                } else if (cell.querySelector('.lotka-cell-content #Sun') ||
                          cell.querySelector('svg[aria-label="Sun"]') ||
                          cell.querySelector('.lotka-cell-zero-path')) {
                    state.board[row][col].contains = CellState.SUN;
                } else {
                    // Check for themed cells
                    for (const themedCell of ThemedCellState) {
                        if (cell.querySelector(`.lotka-cell-content [aria-label="${themedCell.MOON}"]`)) {
                            state.board[row][col].contains = CellState.MOON;
                        } else if (cell.querySelector(`.lotka-cell-content [aria-label="${themedCell.SUN}"]`)) {
                            state.board[row][col].contains = CellState.SUN;
                        }
                    }
                }

                // Parse right edge (horizontal edge)
                const rightEdge = cell.querySelector('.lotka-cell-edge.lotka-cell-edge--right');
                if (rightEdge && col < EDGE_SIZE) {
                    const svg = rightEdge.querySelector('svg');
                    if (svg) {
                        const label = svg.getAttribute('aria-label');
                        state.edges.horizontal[row][col].state = label === 'Cross' ? EdgeState.OPPOSITE : EdgeState.EQUAL;
                    }
                }

                // Parse bottom edge (vertical edge)
                const bottomEdge = cell.querySelector('.lotka-cell-edge.lotka-cell-edge--down');
                if (bottomEdge && row < EDGE_SIZE) {
                    const svg = bottomEdge.querySelector('svg');
                    if (svg) {
                        const label = svg.getAttribute('aria-label');
                        state.edges.vertical[row][col].state = label === 'Cross' ? EdgeState.OPPOSITE : EdgeState.EQUAL;
                    }
                }
            }
        }

        return state;
    }

    // Check if a cell placement is valid
    isValidPlacement(row, col, symbol) {
        // Check for three in a row (horizontal)
        if (col >= 2) {
            if (this.simulatedGameState.board[row][col - 1].contains === symbol &&
                this.simulatedGameState.board[row][col - 2].contains === symbol) {
                return false;
            }
        }
        if (col <= BOARD_SIZE - 3) {
            if (this.simulatedGameState.board[row][col + 1].contains === symbol &&
                this.simulatedGameState.board[row][col + 2].contains === symbol) {
                return false;
            }
        }
        if (col > 0 && col < BOARD_SIZE - 1) {
            if (this.simulatedGameState.board[row][col - 1].contains === symbol &&
                this.simulatedGameState.board[row][col + 1].contains === symbol) {
                return false;
            }
        }

        // Check for three in a row (vertical)
        if (row >= 2) {
            if (this.simulatedGameState.board[row - 1][col].contains === symbol &&
                this.simulatedGameState.board[row - 2][col].contains === symbol) {
                return false;
            }
        }
        if (row <= BOARD_SIZE - 3) {
            if (this.simulatedGameState.board[row + 1][col].contains === symbol &&
                this.simulatedGameState.board[row + 2][col].contains === symbol) {
                return false;
            }
        }
        if (row > 0 && row < BOARD_SIZE - 1) {
            if (this.simulatedGameState.board[row - 1][col].contains === symbol &&
                this.simulatedGameState.board[row + 1][col].contains === symbol) {
                return false;
            }
        }

        // Check column balance
        const colCounts = { [CellState.MOON]: 0, [CellState.SUN]: 0 };
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (r !== row && this.simulatedGameState.board[r][col].contains !== CellState.EMPTY) {
                colCounts[this.simulatedGameState.board[r][col].contains]++;
            }
        }
        if (colCounts[symbol] + 1 > BOARD_SIZE / 2) {
            return false;
        }

        // Check row balance
        const rowCounts = { [CellState.MOON]: 0, [CellState.SUN]: 0 };
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (c !== col && this.simulatedGameState.board[row][c].contains !== CellState.EMPTY) {
                rowCounts[this.simulatedGameState.board[row][c].contains]++;
            }
        }
        if (rowCounts[symbol] + 1 > BOARD_SIZE / 2) {
            return false;
        }

        // Check edge constraints
        // Horizontal edges
        if (col < EDGE_SIZE) {
            const edge = this.simulatedGameState.edges.horizontal[row][col];
            if (edge.state === EdgeState.EQUAL &&
                this.simulatedGameState.board[row][col + 1].contains !== CellState.EMPTY &&
                this.simulatedGameState.board[row][col + 1].contains !== symbol) {
                return false;
            }
            if (edge.state === EdgeState.OPPOSITE &&
                this.simulatedGameState.board[row][col + 1].contains !== CellState.EMPTY &&
                this.simulatedGameState.board[row][col + 1].contains === symbol) {
                return false;
            }
        }
        if (col > 0) {
            const edge = this.simulatedGameState.edges.horizontal[row][col - 1];
            if (edge.state === EdgeState.EQUAL &&
                this.simulatedGameState.board[row][col - 1].contains !== CellState.EMPTY &&
                this.simulatedGameState.board[row][col - 1].contains !== symbol) {
                return false;
            }
            if (edge.state === EdgeState.OPPOSITE &&
                this.simulatedGameState.board[row][col - 1].contains !== CellState.EMPTY &&
                this.simulatedGameState.board[row][col - 1].contains === symbol) {
                return false;
            }
        }

        // Vertical edges
        if (row < EDGE_SIZE) {
            const edge = this.simulatedGameState.edges.vertical[row][col];
            if (edge.state === EdgeState.EQUAL &&
                this.simulatedGameState.board[row + 1][col].contains !== CellState.EMPTY &&
                this.simulatedGameState.board[row + 1][col].contains !== symbol) {
                return false;
            }
            if (edge.state === EdgeState.OPPOSITE &&
                this.simulatedGameState.board[row + 1][col].contains !== CellState.EMPTY &&
                this.simulatedGameState.board[row + 1][col].contains === symbol) {
                return false;
            }
        }
        if (row > 0) {
            const edge = this.simulatedGameState.edges.vertical[row - 1][col];
            if (edge.state === EdgeState.EQUAL &&
                this.simulatedGameState.board[row - 1][col].contains !== CellState.EMPTY &&
                this.simulatedGameState.board[row - 1][col].contains !== symbol) {
                return false;
            }
            if (edge.state === EdgeState.OPPOSITE &&
                this.simulatedGameState.board[row - 1][col].contains !== CellState.EMPTY &&
                this.simulatedGameState.board[row - 1][col].contains === symbol) {
                return false;
            }
        }

        return true;
    }

    // Get adjacent cells that are empty
    getAdjacentEmptyCells(row, col) {
        const adjacent = [];
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

        for (const [dx, dy] of directions) {
            const newRow = row + dx;
            const newCol = col + dy;
            if (newRow >= 0 && newRow < BOARD_SIZE &&
                newCol >= 0 && newCol < BOARD_SIZE &&
                this.simulatedGameState.board[newRow][newCol].contains === CellState.EMPTY) {
                adjacent.push([newRow, newCol]);
            }
        }

        return adjacent;
    }

    // Place a symbol
    placeSymbol(row, col, symbol) {
        this.simulatedGameState.board[row][col].contains = symbol;
        return true;
    }

    // Solve the puzzle using DFS
    solvePuzzle() {
        if (this.shouldStop) return null;

        const emptyCells = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.simulatedGameState.board[row][col].contains === CellState.EMPTY) {
                    emptyCells.push([row, col]);
                }
            }
        }

        // Sort empty cells by number of adjacent empty cells (heuristic)
        emptyCells.sort((a, b) => {
            const aAdjacent = this.getAdjacentEmptyCells(a[0], a[1]).length;
            const bAdjacent = this.getAdjacentEmptyCells(b[0], b[1]).length;
            return aAdjacent - bAdjacent;
        });

        const solution = [];

        const dfs = (index) => {
            if (this.shouldStop) return false;

            if (index === emptyCells.length) {
                return true;
            }

            const [row, col] = emptyCells[index];

            // Try placing moon first
            if (this.isValidPlacement(row, col, CellState.MOON)) {
                if (this.placeSymbol(row, col, CellState.MOON)) {
                    solution.push([row, col, CellState.MOON]);
                    if (dfs(index + 1)) {
                        return true;
                    }
                    solution.pop();
                    this.simulatedGameState.board[row][col].contains = CellState.EMPTY;
                }
            }

            // Try placing sun
            if (this.isValidPlacement(row, col, CellState.SUN)) {
                if (this.placeSymbol(row, col, CellState.SUN)) {
                    solution.push([row, col, CellState.SUN]);
                    if (dfs(index + 1)) {
                        return true;
                    }
                    solution.pop();
                    this.simulatedGameState.board[row][col].contains = CellState.EMPTY;
                }
            }

            return false;
        };

        if (dfs(0)) {
            return solution;
        }
        return null;
    }

    async inputSolution(solution) {
        if (this.shouldStop) return false;

        if (!solution || solution.length === 0) {
            return true;
        }

        // Filter out cells that are already filled in the base game
        const newPlacements = solution.filter(([row, col, symbol]) =>
            this.baseGameState.board[row][col].contains === CellState.EMPTY
        );

        // Sort placements by row first, then column
        newPlacements.sort(([rowA, colA], [rowB, colB]) => {
            if (rowA !== rowB) return rowA - rowB;
            return colA - colB;
        });

        console.log(`Placing ${newPlacements.length} new symbols`);

        // Create mouse event helper function
        const createMouseEvent = (type) => new MouseEvent(type, {
            view: window,
            bubbles: true,
            cancelable: true,
            buttons: 1
        });

        // Click cells to place symbols in order
        for (const [row, col, symbol] of newPlacements) {
            if (this.shouldStop) return false;

            const cellIndex = row * BOARD_SIZE + col;
            const cell = document.querySelector(`#lotka-cell-${cellIndex}`);

            if (cell && !cell.classList.contains('lotka-cell--locked')) {
                console.log(`Placing ${symbol} at (${row},${col})`);

                if (symbol === CellState.SUN) {
                    // Single click for sun
                    cell.dispatchEvent(createMouseEvent('mousedown'));
                    await new Promise(resolve => setTimeout(resolve, 10));
                    cell.dispatchEvent(createMouseEvent('mouseup'));
                    cell.dispatchEvent(createMouseEvent('click'));
                } else if (symbol === CellState.MOON) {
                    // Double click for moon
                    // First click
                    cell.dispatchEvent(createMouseEvent('mousedown'));
                    await new Promise(resolve => setTimeout(resolve, 10));
                    cell.dispatchEvent(createMouseEvent('mouseup'));
                    cell.dispatchEvent(createMouseEvent('click'));

                    // Wait between clicks
                    await new Promise(resolve => setTimeout(resolve, 10));

                    // Second click
                    cell.dispatchEvent(createMouseEvent('mousedown'));
                    await new Promise(resolve => setTimeout(resolve, 10));
                    cell.dispatchEvent(createMouseEvent('mouseup'));
                    cell.dispatchEvent(createMouseEvent('click'));
                }

                // Wait between cells
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            if (this.shouldStop) return false;
        }

        return true;
    }

    // Convert old solver format to new format for compatibility
    convertOldSolution(oldSolution) {
        if (!oldSolution || !oldSolution.cells) return null;

        const newSolution = [];
        for (let r = 0; r < oldSolution.size; r++) {
            for (let c = 0; c < oldSolution.size; c++) {
                const cell = oldSolution.cells[r][c];
                if (cell.state !== 'unknown') {
                    const symbol = cell.state === 'sun' ? CellState.SUN : CellState.MOON;
                    newSolution.push([r, c, symbol]);
                }
            }
        }
        return newSolution;
    }
}

// Export to window for global access
window.TangoSolver = TangoSolver;
window.TangoSolverV2 = TangoSolver; // Keep V2 reference for compatibility
window.CellState = CellState;
window.EdgeState = EdgeState;

} // End of duplicate prevention check