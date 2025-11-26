(function() {
  // Keep originals
  const _log = console.log.bind(console);
  const _info = console.info ? console.info.bind(console) : _log;
  const _warn = console.warn.bind(console);
  const _error = console.error.bind(console);
  const _debug = console.debug ? console.debug.bind(console) : _log;

  function send(level, args) {
    try {
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.sendLog === 'function') {
        // Convert arguments to simple array for IPC transport
        window.electronAPI.sendLog(level, args);
      }
    } catch (e) {
      // ignore send errors
    }
  }

  // Override console methods to forward to main process while preserving local output
  console.log = function(...args) {
    send('info', args);
    _log(...args);
  };
  console.info = function(...args) {
    send('info', args);
    _info(...args);
  };
  console.warn = function(...args) {
    send('warn', args);
    _warn(...args);
  };
  console.error = function(...args) {
    send('error', args);
    _error(...args);
  };
  console.debug = function(...args) {
    send('debug', args);
    _debug(...args);
  };

  // Expose a small helper if other modules prefer explicit API
  window.appLogger = {
    info: (...a) => console.info(...a),
    warn: (...a) => console.warn(...a),
    error: (...a) => console.error(...a),
    debug: (...a) => console.debug(...a)
  };
})();
