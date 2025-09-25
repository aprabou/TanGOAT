# LinkedIn Tango Solver - Chrome Extension

A Chrome extension that automatically solves Tango puzzles on LinkedIn Games using advanced constraint satisfaction algorithms.

## Installation

### Step 1: Clone | Download ZIP & Give TanGOAT a Star
That second part is mandatory btw or it wont work (real)

### Step 2: Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `TanGOAT` folder containing the extension files
5. The extension should now appear in your extensions list

## Usage

### Method 1: Using the Popup
1. Navigate to LinkedIn Games Tango: `https://www.linkedin.com/games/tango`
2. Click the extension icon in your Chrome toolbar
3. Click "Solve Puzzle" to automatically solve the current puzzle
4. Click "Get Hint" to highlight the next logical move

### Method 2: Console Logging
1. The extension works silently in the background
2. Open browser console (F12) to see detailed solving progress
3. Status messages will appear in the console during solving

## How It Works

The extension implements a sophisticated constraint satisfaction solver based on the following rules:

### Game Rules
1. **Adjacency Rule**: No more than two identical symbols (SUN/MOON) can be adjacent
2. **Row/Column Parity**: Each row and column must contain equal numbers of SUNs and MOONs
3. **Equality Constraints**: Cells marked with "=" must have the same symbol
4. **Opposition Constraints**: Cells marked with "X" must have opposite symbols

### Solving Algorithm
1. **Board State Parsing**: Reads LinkedIn's DOM structure to extract current game state
2. **DFS with Constraint Validation**: Uses depth-first search with comprehensive rule checking
3. **LinkedIn Integration**: Automatically clicks cells using single-click (Sun) and double-click (Moon) patterns
4. **Smart Heuristics**: Prioritizes cells with fewer adjacent empty cells for efficient solving

## Troubleshooting

### "Receiving end does not exist" Error
This error means the content script isn't loaded properly:
1. **Reload the extension**: Go to `chrome://extensions/` and click the reload button (🔄) on the Tango Solver extension
2. **Refresh the LinkedIn page**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) the LinkedIn Games page
3. **Check URL matching**: Make sure you're on a page that matches: `linkedin.com/games/*`
4. **Wait for page load**: Let the LinkedIn page fully load before clicking the extension

### Extension Not Working
- Make sure you're on the correct LinkedIn Games page (any games page should work)
- Check that the extension is enabled in `chrome://extensions/`
- Try refreshing the page and waiting for the game to fully load
- Look for the overlay in the top-right corner of the page

### Testing the Extension
1. Open `test-page.html` in your browser to verify the extension loads
2. You should see the overlay appear and be able to interact with the mock game board
3. Check the browser console (F12) for any error messages

### Game Board Not Detected
The extension tries multiple LinkedIn-specific selectors:
- `.lotka-grid` (primary LinkedIn selector)
- `.lotka-board`
- `.grid-board-wrapper`
- And several fallback selectors

If the game board isn't detected, the page structure may have changed. The extension will retry when the DOM changes.

### Cells Not Clicking
The extension tries multiple interaction methods:
- Mouse events (click, mousedown, mouseup)
- Touch events for mobile compatibility
- Direct state manipulation

If automated clicking doesn't work, you can still use the hints to solve manually.

## Files Overview

- `manifest.json` - Extension configuration
- `content.js` - Main content script that interacts with the LinkedIn page
- `solver.js` - Tango puzzle solving algorithm
- `popup.html/js` - Extension popup interface
- `styles.css` - UI styling for the overlay and highlights

## Development

### Adding New Game Selectors
If LinkedIn changes their game structure, add new selectors to the `possibleSelectors` array in `content.js`.

### Improving the Solver
The solver is based on formal constraint satisfaction principles. Key areas for improvement:
- Enhanced constraint detection for new game variants
- Better heuristics for variable ordering
- Performance optimizations for larger grids

### Debugging
- Check browser console for error messages
- Use Chrome DevTools to inspect the game board structure
- Enable verbose logging by uncommenting debug statements

## Algorithm Details

The solver implements a multi-stage approach:

1. **Parsing**: Extracts grid state and constraints from the DOM
2. **Initialization**: Sets up Union-Find for equality groups
3. **Propagation**: Applies deterministic rules until convergence
4. **Search**: Uses backtracking for remaining unknowns if needed

### Key Algorithms
- **Union-Find**: Manages equality constraint groups efficiently
- **Constraint Propagation**: Maintains arc consistency
- **Backtracking**: Explores solution space with intelligent pruning

## Support

If you encounter issues:
1. Check that you're using the latest version of Chrome
2. Verify the LinkedIn Tango page structure hasn't changed significantly
3. Try disabling other extensions that might interfere
4. Clear browser cache and reload the page

The extension is designed to be robust and handle various game board layouts, but LinkedIn may occasionally update their game interface.