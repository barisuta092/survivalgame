import { Game } from './Game.js';

window.onerror = function (message, source, lineno, colno, error) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '10px';
  div.style.left = '10px';
  div.style.background = 'rgba(255, 0, 0, 0.9)';
  div.style.color = 'white';
  div.style.padding = '20px';
  div.style.zIndex = '999999';
  div.style.border = '2px solid white';
  div.style.fontFamily = 'monospace';
  div.style.whiteSpace = 'pre-wrap';
  div.innerHTML = `<strong>Error:</strong> ${message}<br><br><strong>Location:</strong> ${source}:${lineno}:${colno}<br><br><strong>Stack:</strong><br>${error?.stack || 'No stack trace'}`;
  document.body.appendChild(div);
  console.error(error);
};

window.onload = () => {
  try {
    const game = new Game();
    window.game = game; // Expose for debugging
  } catch (e) {
    window.onerror(e.message, 'window.onload', 0, 0, e);
  }
};
