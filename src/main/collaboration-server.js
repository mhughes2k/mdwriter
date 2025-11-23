const { Server } = require('socket.io');
const crypto = require('crypto');

/**
 * Generate a random session ID
 */
function generateSessionId() {
  return crypto.randomBytes(5).toString('base64url');
}

/**
 * Collaboration Server
 * 
 * Manages WebSocket server for real-time collaborative editing
 */
class CollaborationServer {
  constructor() {
    this.io = null;
    this.httpServer = null;
    this.sessions = new Map(); // sessionId -> session data
    this.port = null;
  }

  /**
   * Start collaboration server
   * @param {number} port - Port to listen on (0 for random)
   * @returns {Promise<number>} - Actual port number
   */
  async start(port = 0) {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        const http = require('http');
        this.httpServer = http.createServer();
        
        // Create Socket.IO server
        this.io = new Server(this.httpServer, {
          cors: {
            origin: '*',
            methods: ['GET', 'POST']
          },
          transports: ['websocket', 'polling']
        });

        // Setup connection handler
        this.io.on('connection', (socket) => {
          console.log('[Collab] Client connected:', socket.id);
          this.handleConnection(socket);
        });

        // Start listening
        this.httpServer.listen(port, () => {
          this.port = this.httpServer.address().port;
          console.log(`[Collab] Server started on port ${this.port}`);
          resolve(this.port);
        });

        this.httpServer.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Stop collaboration server
   */
  async stop() {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          console.log('[Collab] Server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Create a new collaboration session
   * @param {Object} document - Initial document state
   * @param {Object} metadata - Session metadata (title, host info, etc.)
   * @returns {Object} - Session info
   */
  createSession(document, metadata = {}) {
    const sessionId = generateSessionId();
    const session = {
      id: sessionId,
      document: JSON.parse(JSON.stringify(document)), // Deep clone
      metadata: {
        title: metadata.title || 'Untitled Document',
        hostName: metadata.hostName || 'Unknown',
        createdAt: Date.now(),
        ...metadata
      },
      users: new Map(), // socketId -> user info
      version: 0, // Document version for conflict resolution
      history: [] // Operation history
    };

    this.sessions.set(sessionId, session);
    console.log(`[Collab] Created session: ${sessionId}`);
    return {
      sessionId,
      metadata: session.metadata,
      port: this.port
    };
  }

  /**
   * Get session information
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      metadata: session.metadata,
      userCount: session.users.size,
      users: Array.from(session.users.values()),
      version: session.version
    };
  }

  /**
   * Get all active sessions
   */
  getAllSessions() {
    const sessions = [];
    for (const [id, session] of this.sessions.entries()) {
      sessions.push({
        id,
        metadata: session.metadata,
        userCount: session.users.size,
        users: Array.from(session.users.values())
      });
    }
    return sessions;
  }

  /**
   * Handle new client connection
   */
  handleConnection(socket) {
    // Join session
    socket.on('join-session', ({ sessionId, user }) => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Add user to session
      const userData = {
        id: socket.id,
        name: user.name || 'Anonymous',
        color: user.color || this.generateUserColor(),
        joinedAt: Date.now()
      };
      
      session.users.set(socket.id, userData);
      socket.join(sessionId);
      socket.sessionId = sessionId;

      console.log(`[Collab] User ${userData.name} joined session ${sessionId}`);

      // Send current document state to new user
      socket.emit('session-joined', {
        document: session.document,
        version: session.version,
        users: Array.from(session.users.values()),
        metadata: session.metadata
      });

      // Notify other users
      socket.to(sessionId).emit('user-joined', userData);
    });

    // Handle document updates
    socket.on('document-update', ({ sessionId, operation, version }) => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      // Check version for conflict detection
      if (version !== session.version) {
        socket.emit('conflict', { 
          expectedVersion: session.version,
          receivedVersion: version 
        });
        return;
      }

      // Apply operation to document
      try {
        this.applyOperation(session.document, operation);
        session.version++;
        session.history.push({
          operation,
          version: session.version,
          userId: socket.id,
          timestamp: Date.now()
        });

        // Broadcast update to all users in session (including sender)
        this.io.to(sessionId).emit('document-updated', {
          operation,
          version: session.version,
          userId: socket.id
        });

        console.log(`[Collab] Document updated in session ${sessionId}, version ${session.version}`);
      } catch (err) {
        console.error('[Collab] Error applying operation:', err);
        socket.emit('error', { message: 'Failed to apply operation' });
      }
    });

    // Handle cursor updates
    socket.on('cursor-update', ({ sessionId, cursor }) => {
      if (!this.sessions.has(sessionId)) return;
      
      socket.to(sessionId).emit('cursor-updated', {
        userId: socket.id,
        cursor
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;

      const session = this.sessions.get(sessionId);
      if (!session) return;

      const user = session.users.get(socket.id);
      session.users.delete(socket.id);

      console.log(`[Collab] User ${user?.name} left session ${sessionId}`);

      // Notify other users
      socket.to(sessionId).emit('user-left', { userId: socket.id });

      // Clean up empty sessions
      if (session.users.size === 0) {
        console.log(`[Collab] Removing empty session ${sessionId}`);
        this.sessions.delete(sessionId);
      }
    });
  }

  /**
   * Apply an operation to the document
   * @param {Object} document - Document to modify
   * @param {Object} operation - Operation to apply
   */
  applyOperation(document, operation) {
    const { type, path, value, oldValue } = operation;

    switch (type) {
      case 'set':
        this.setValueAtPath(document, path, value);
        break;
      case 'delete':
        this.deleteValueAtPath(document, path);
        break;
      case 'array-insert':
        this.insertArrayItem(document, path, value, operation.index);
        break;
      case 'array-remove':
        this.removeArrayItem(document, path, operation.index);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Set value at path in document
   */
  setValueAtPath(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const arrayMatch = part.match(/(.+)\[(\d+)\]/);
      
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key][parseInt(index)];
      } else {
        if (!(part in current)) current[part] = {};
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    const arrayMatch = lastPart.match(/(.+)\[(\d+)\]/);
    
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current[key][parseInt(index)] = value;
    } else {
      current[lastPart] = value;
    }
  }

  /**
   * Delete value at path
   */
  deleteValueAtPath(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    
    delete current[parts[parts.length - 1]];
  }

  /**
   * Insert array item
   */
  insertArrayItem(obj, path, value, index) {
    const arr = this.getValueAtPath(obj, path);
    if (!Array.isArray(arr)) {
      throw new Error('Path does not point to an array');
    }
    arr.splice(index, 0, value);
  }

  /**
   * Remove array item
   */
  removeArrayItem(obj, path, index) {
    const arr = this.getValueAtPath(obj, path);
    if (!Array.isArray(arr)) {
      throw new Error('Path does not point to an array');
    }
    arr.splice(index, 1);
  }

  /**
   * Get value at path
   */
  getValueAtPath(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      const arrayMatch = part.match(/(.+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key][parseInt(index)];
      } else {
        current = current[part];
      }
    }
    
    return current;
  }

  /**
   * Generate random color for user
   */
  generateUserColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AAB7B8'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

module.exports = CollaborationServer;
