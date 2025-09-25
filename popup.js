document.addEventListener('DOMContentLoaded', function() {
  const solveBtn = document.getElementById('solveBtn');
  const hintBtn = document.getElementById('hintBtn');
  const statusDiv = document.getElementById('status');

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    statusDiv.style.display = 'block';

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  solveBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('linkedin.com/games')) {
        showStatus('Please navigate to LinkedIn Games first', true);
        return;
      }

      // Check if content script is loaded by trying to send a ping message first
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch (pingError) {
        // Content script not loaded, inject it
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['solver.js', 'content.js']
          });
          // Wait a bit for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (injectionError) {
          console.log('Content script injection failed:', injectionError.message);
        }
      }

      // Try to send message with timeout
      await Promise.race([
        chrome.tabs.sendMessage(tab.id, { action: 'solve' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      showStatus('Solving puzzle...');
    } catch (error) {
      if (error.message.includes('Receiving end does not exist')) {
        showStatus('Extension not loaded on page. Please refresh and try again.', true);
      } else {
        showStatus('Error: ' + error.message, true);
      }
    }
  });

  hintBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('linkedin.com/games')) {
        showStatus('Please navigate to LinkedIn Games first', true);
        return;
      }

      // Check if content script is loaded by trying to send a ping message first
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
      } catch (pingError) {
        // Content script not loaded, inject it
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['solver.js', 'content.js']
          });
          // Wait a bit for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (injectionError) {
          console.log('Content script injection failed:', injectionError.message);
        }
      }

      // Try to send message with timeout
      await Promise.race([
        chrome.tabs.sendMessage(tab.id, { action: 'hint' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);

      showStatus('Getting hint...');
    } catch (error) {
      if (error.message.includes('Receiving end does not exist')) {
        showStatus('Extension not loaded on page. Please refresh and try again.', true);
      } else {
        showStatus('Error: ' + error.message, true);
      }
    }
  });
});