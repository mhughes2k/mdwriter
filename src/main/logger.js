// Central logger for main process. Falls back to console during tests
// to avoid writing to mocked file descriptors in the Jest environment.
let logger;
try {
  const pino = require('pino');
  if (process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
    // In test environment prefer simple console-based logger
    logger = {
      info: (...args) => console.info(...args),
      warn: (...args) => console.warn(...args),
      error: (...args) => console.error(...args),
      debug: (...args) => console.debug(...args)
    };
  } else {
    logger = pino({ level: process.env.LOG_LEVEL || 'info' });
  }
} catch (e) {
  // If pino isn't available for any reason, fallback to console
  logger = {
    info: (...args) => console.info(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    debug: (...args) => console.debug(...args)
  };
}

module.exports = logger;
