// Prevent duplicate class declarations and multiple initialization
if (typeof window.LinkedInTangoIntegration === 'undefined') {

class LinkedInTangoIntegration {
  constructor() {
    // Use the TangoSolverV2 (now renamed to TangoSolver)
    this.solver = new window.TangoSolverV2();
    this.gameSelector = null;
    this.overlay = null;
    this.currentGameData = null;
    this.isNewSolver = true; // Always use new solver now

    this.init();
  }

  init() {
    this.detectGameSelectors();
    // this.createOverlay(); // Disabled - use only toolbar popup
    this.setupMessageListener();

    this.observeGameChanges();
  }

  detectGameSelectors() {
    const possibleSelectors = [
      '.lotka-grid', // LinkedIn's specific Tango grid class
      '.game-board',
      '.grid-board-wrapper',
      '.tango-game-board',
      '[data-testid="tango-board"]',
      '.puzzle-grid',
      '.game-grid',
      '.tango-puzzle',
      '.puzzle-container .grid',
      '.game-container .board'
    ];

    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        this.gameSelector = selector;
        console.log(`Found Tango game board using selector: ${selector}`);
        break;
      }
    }

    if (!this.gameSelector) {
      console.log('Game board not found, will retry when DOM changes');
    }
  }

  createOverlay() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'tango-solver-overlay';
    this.overlay.innerHTML = `
      <h3>🌙 Tango Solver</h3>
      <button id="tango-solve-btn">Solve Puzzle</button>
      <button id="tango-hint-btn">Get Hint</button>
      <button id="tango-toggle-btn">Hide</button>
      <div id="tango-status" class="status" style="display: none;"></div>
    `;

    document.body.appendChild(this.overlay);

    document.getElementById('tango-solve-btn').addEventListener('click', () => {
      this.solvePuzzle();
    });

    document.getElementById('tango-hint-btn').addEventListener('click', () => {
      this.getHint();
    });

    document.getElementById('tango-toggle-btn').addEventListener('click', () => {
      this.toggleOverlay();
    });
  }

  setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        try {
          if (request.action === 'ping') {
            sendResponse({ success: true, status: 'loaded' });
          } else if (request.action === 'solve') {
            this.solvePuzzle();
            sendResponse({ success: true });
          } else if (request.action === 'hint') {
            this.getHint();
            sendResponse({ success: true });
          }
        } catch (error) {
          console.error('Error handling message:', error);
          sendResponse({ success: false, error: error.message });
        }
        return true;
      });
    }
  }

  observeGameChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldRedetect = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.querySelector && (
                node.querySelector('.tango-game-board') ||
                node.querySelector('.game-board') ||
                node.querySelector('.puzzle-grid')
              )) {
                shouldRedetect = true;
              }
            }
          });
        }
      });

      if (shouldRedetect && !this.gameSelector) {
        setTimeout(() => this.detectGameSelectors(), 500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  findGameBoard() {
    if (this.gameSelector) {
      const board = document.querySelector(this.gameSelector);
      if (board) return board;
    }

    const fallbackSelectors = [
      '.lotka-board', // LinkedIn's board wrapper
      '.grid-board-wrapper', // LinkedIn's grid wrapper
      '.game-container',
      '.puzzle-container',
      '.tango-container',
      '[class*="game"]',
      '[class*="puzzle"]',
      '[class*="tango"]',
      '[class*="lotka"]' // LinkedIn-specific
    ];

    for (const selector of fallbackSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        const cells = container.querySelectorAll(
          '.lotka-cell, [data-cell], .cell, .game-cell, [class*="cell"], .tile, [class*="tile"]'
        );
        if (cells.length > 9) { // At least 4x4 grid
          return container;
        }
      }
    }

    return null;
  }

  async solvePuzzle() {
    try {
      const gameBoard = this.findGameBoard();
      if (!gameBoard) {
        this.showStatus('Game board not found. Make sure you\'re on the Tango game page.', true);
        return;
      }

      this.showStatus('Analyzing puzzle...', false);

      if (this.isNewSolver) {
        // Use new solver with proper LinkedIn integration
        await this.solver.initialize();

        this.solver.baseGameState = await this.solver.parseBoardState();
        this.solver.simulatedGameState = {
          board: JSON.parse(JSON.stringify(this.solver.baseGameState.board)),
          edges: this.solver.baseGameState.edges
        };

        console.log('Board state parsed:', this.solver.baseGameState);

        this.showStatus('Solving puzzle...', false);
        const solution = this.solver.solvePuzzle();

        if (!solution) {
          this.showStatus('No solution found or stopped by user', true);
          return;
        }

        console.log('Solution found:', solution);
        this.showStatus('Applying solution...', false);

        const inputResult = await this.solver.inputSolution(solution);
        if (inputResult) {
          this.showStatus('Puzzle solved! 🎉', false);
        } else {
          this.showStatus('Failed to input solution', true);
        }

      } else {
        // Fallback to old solver
        this.currentGameData = this.solver.parseGrid(gameBoard);
        if (!this.currentGameData) {
          this.showStatus('Could not parse the game grid', true);
          return;
        }

        const solution = this.solver.solve(this.currentGameData);
        if (!solution) {
          this.showStatus('No solution found', true);
          return;
        }

        this.applySolution(solution);
        this.showStatus('Puzzle solved! 🎉', false);
      }

    } catch (error) {
      console.error('Error solving puzzle:', error);
      this.showStatus('Error solving puzzle: ' + error.message, true);
    }
  }

  getHint() {
    try {
      const gameBoard = this.findGameBoard();
      if (!gameBoard) {
        this.showStatus('Game board not found', true);
        return;
      }

      this.currentGameData = this.solver.parseGrid(gameBoard);
      if (!this.currentGameData) {
        this.showStatus('Could not parse the game grid', true);
        return;
      }

      const hint = this.solver.getHint(this.currentGameData);
      if (!hint) {
        this.showStatus('No hints available', true);
        return;
      }

      this.highlightHint(hint);
      this.showStatus(`Hint: Try ${hint.state.toUpperCase()} at row ${hint.row + 1}, col ${hint.col + 1}`, false);

    } catch (error) {
      console.error('Error getting hint:', error);
      this.showStatus('Error getting hint: ' + error.message, true);
    }
  }

  applySolution(solution) {
    for (let r = 0; r < solution.size; r++) {
      for (let c = 0; c < solution.size; c++) {
        const cell = solution.cells[r][c];
        if (cell.element && cell.state !== this.solver.CELL_TYPES.UNKNOWN) {
          this.setCellState(cell.element, cell.state);
        }
      }
    }
  }

  setCellState(cellElement, state) {
    // Skip if cell is locked (pre-filled)
    if (cellElement.classList.contains('lotka-cell--locked')) {
      return;
    }

    const currentState = this.getCurrentCellState(cellElement);
    if (currentState === state) {
      return; // Already in desired state
    }

    // For LinkedIn Tango, we need to simulate clicks to cycle through states
    if (state === this.solver.CELL_TYPES.SUN) {
      this.clickUntilState(cellElement, 'sun');
    } else if (state === this.solver.CELL_TYPES.MOON) {
      this.clickUntilState(cellElement, 'moon');
    }

    // Fallback for non-LinkedIn games
    cellElement.classList.remove('sun', 'moon', 'unknown');

    if (state === this.solver.CELL_TYPES.SUN) {
      cellElement.classList.add('sun');
      cellElement.textContent = '☀';
      cellElement.setAttribute('data-state', 'sun');
    } else if (state === this.solver.CELL_TYPES.MOON) {
      cellElement.classList.add('moon');
      cellElement.textContent = '🌙';
      cellElement.setAttribute('data-state', 'moon');
    }
  }

  clickUntilState(cellElement, desiredState) {
    const maxClicks = 3; // Sun -> Moon -> Empty -> Sun
    let clickCount = 0;

    const attemptClick = () => {
      if (clickCount >= maxClicks) return;

      const currentState = this.getCurrentCellState(cellElement);
      if ((desiredState === 'sun' && currentState === this.solver.CELL_TYPES.SUN) ||
          (desiredState === 'moon' && currentState === this.solver.CELL_TYPES.MOON)) {
        return; // Success!
      }

      this.simulateClick(cellElement);
      clickCount++;

      // Wait a bit for the state to update, then check again
      setTimeout(() => {
        attemptClick();
      }, 200);
    };

    attemptClick();
  }

  getCurrentCellState(cellElement) {
    // Use the solver's getCellState method for consistency
    return this.solver.getCellState(cellElement);
  }

  simulateClick(element) {
    // Try multiple event types to ensure compatibility
    const events = ['click', 'mousedown', 'mouseup', 'tap'];

    events.forEach(eventType => {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    });

    // Also try touch events for mobile compatibility
    const touchEvent = new TouchEvent('touchstart', {
      view: window,
      bubbles: true,
      cancelable: true,
      touches: [new Touch({
        identifier: 1,
        target: element,
        clientX: element.getBoundingClientRect().left + element.offsetWidth / 2,
        clientY: element.getBoundingClientRect().top + element.offsetHeight / 2
      })]
    });
    element.dispatchEvent(touchEvent);
  }

  highlightHint(hint) {
    // Remove previous highlights
    document.querySelectorAll('.tango-solver-highlight').forEach(el => {
      el.classList.remove('tango-solver-highlight');
    });

    // Highlight the hint cell
    hint.element.classList.add('tango-solver-highlight');

    setTimeout(() => {
      hint.element.classList.remove('tango-solver-highlight');
    }, 3000);
  }

  showStatus(message, isError = false) {
    // If overlay is disabled, just log to console
    if (!this.overlay) {
      console.log(`Tango Solver: ${message}`);
      return;
    }

    const statusDiv = this.overlay.querySelector('#tango-status');
    if (!statusDiv) {
      console.log(`Tango Solver: ${message}`);
      return;
    }

    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 4000);
  }

  toggleOverlay() {
    // If overlay is disabled, do nothing
    if (!this.overlay) {
      return;
    }

    const toggleBtn = this.overlay.querySelector('#tango-toggle-btn');
    const buttons = this.overlay.querySelectorAll('button:not(#tango-toggle-btn)');
    const title = this.overlay.querySelector('h3');
    const status = this.overlay.querySelector('#tango-status');

    if (toggleBtn.textContent === 'Hide') {
      buttons.forEach(btn => btn.style.display = 'none');
      title.style.display = 'none';
      status.style.display = 'none';
      toggleBtn.textContent = 'Show';
      this.overlay.style.minWidth = '60px';
    } else {
      buttons.forEach(btn => btn.style.display = 'inline-block');
      title.style.display = 'block';
      toggleBtn.textContent = 'Hide';
      this.overlay.style.minWidth = '';
    }
  }
}

// Export to window for global access
window.LinkedInTangoIntegration = LinkedInTangoIntegration;

// Initialize the extension when the page loads
if (!window.tangoIntegrationInstance) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.tangoIntegrationInstance = new LinkedInTangoIntegration();
    });
  } else {
    window.tangoIntegrationInstance = new LinkedInTangoIntegration();
  }
}

} // End of duplicate prevention check