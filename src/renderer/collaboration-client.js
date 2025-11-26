/**
 * Collaboration Client
 * 
 * WebSocket client for connecting to collaboration sessions
 */
class CollaborationClient {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.userId = null;
    this.version = 0;
    this.connected = false;
    this.users = [];
    this.pendingOperations = [];
    
    // Event handlers
    this.onDocumentUpdated = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onCursorUpdated = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
    this.onConflict = null;
  }

  /**
   * Connect to a collaboration session
   * @param {string} host - Server host
   * @param {number} port - Server port
   * @param {string} sessionId - Session ID to join
   * @param {Object} user - User information
   */
  connect(host, port, sessionId, user) {
    return new Promise((resolve, reject) => {
      try {
        // Check if socket.io client is available
        if (typeof io === 'undefined') {
          reject(new Error('Socket.IO client library not loaded. Please ensure socket.io-client is included.'));
          return;
        }

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error('[CollabClient] Connection timeout');
          if (this.socket) {
            this.socket.close();
          }
          reject(new Error('Connection timeout - could not connect to server'));
        }, 10000); // 10 second timeout

        // Create socket connection
        this.socket = io(`http://${host}:${port}`, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.sessionId = sessionId;

        // Connection established
        this.socket.on('connect', () => {
          console.log('[CollabClient] Connected to server');
          this.connected = true;
          
          // Join the session
          this.socket.emit('join-session', { sessionId, user });
        });

        // Session joined successfully
        this.socket.on('session-joined', ({ document, version, users, metadata }) => {
          console.log('[CollabClient] Joined session:', sessionId);
          clearTimeout(connectionTimeout);
          this.version = version;
          this.users = users;
          this.userId = this.socket.id;
          
          if (this.onConnected) {
            this.onConnected({ document, version, users, metadata });
          }
          
          resolve({ document, version, users, metadata });
        });

        // Document updated by another user
        this.socket.on('document-updated', ({ operation, version, userId }) => {
          console.log('[CollabClient] Document updated:', operation, 'by userId:', userId, 'new version:', version);
          this.version = version;
          
          // Only trigger the callback if it's not our own update
          if (userId !== this.socket.id && this.onDocumentUpdated) {
            this.onDocumentUpdated({ operation, version, userId });
          }
        });

        // User joined
        this.socket.on('user-joined', (user) => {
          console.log('[CollabClient] User joined:', user.name);
          this.users.push(user);
          
          if (this.onUserJoined) {
            this.onUserJoined(user);
          }
        });

        // User left
        this.socket.on('user-left', ({ userId }) => {
          console.log('[CollabClient] User left:', userId);
          this.users = this.users.filter(u => u.id !== userId);
          
          if (this.onUserLeft) {
            this.onUserLeft({ userId });
          }
        });

        // Cursor updated
        this.socket.on('cursor-updated', ({ userId, cursor }) => {
          console.log('[CollabClient] Cursor updated:', { userId, cursor });
          if (this.onCursorUpdated) {
            this.onCursorUpdated({ userId, cursor });
          }
        });

        // Version conflict
        this.socket.on('conflict', ({ expectedVersion, receivedVersion }) => {
          console.error('[CollabClient] Version conflict:', { expectedVersion, receivedVersion });
          
          if (this.onConflict) {
            this.onConflict({ expectedVersion, receivedVersion });
          }
        });

        // Error
        this.socket.on('error', (error) => {
          console.error('[CollabClient] Error:', error);
          
          if (this.onError) {
            this.onError(error);
          }
          
          reject(error);
        });

        // Disconnected
        this.socket.on('disconnect', (reason) => {
          console.log('[CollabClient] Disconnected:', reason);
          this.connected = false;
          
          if (this.onDisconnected) {
            this.onDisconnected({ reason });
          }
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
          console.error('[CollabClient] Connection error:', error);
          console.error('[CollabClient] Error details:', {
            message: error.message,
            description: error.description,
            context: error.context,
            type: error.type
          });
          clearTimeout(connectionTimeout);
          reject(new Error(`WebSocket error: ${error.message || 'Connection failed'}`));
        });

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send document update
   * @param {Object} operation - Operation to apply
   */
  sendUpdate(operation) {
    if (!this.connected || !this.socket) {
      console.error('[CollabClient] Not connected');
      this.pendingOperations.push(operation);
      return false;
    }

    this.socket.emit('document-update', {
      sessionId: this.sessionId,
      operation,
      version: this.version
    });

    return true;
  }

  /**
   * Send cursor position update
   * @param {Object} cursor - Cursor position
   */
  sendCursorUpdate(cursor) {
    if (!this.connected || !this.socket) {
      return false;
    }

    console.log('[CollabClient] Sending cursor update:', cursor);
    this.socket.emit('cursor-update', {
      sessionId: this.sessionId,
      cursor
    });

    return true;
  }

  /**
   * Disconnect from session
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.sessionId = null;
      this.userId = null;
      this.version = 0;
      this.users = [];
      console.log('[CollabClient] Disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }

  /**
   * Get current users in session
   */
  getUsers() {
    return this.users;
  }

  /**
   * Get current document version
   */
  getVersion() {
    return this.version;
  }
}

// Export for use in browser context
if (typeof window !== 'undefined') {
  window.CollaborationClient = CollaborationClient;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CollaborationClient;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.CollaborationClient = CollaborationClient;
  module.exports.getInstance = () => new CollaborationClient();
}
