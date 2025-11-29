/**
 * MDWriter Web Server
 * 
 * Express server that provides:
 * - Static file serving for the web client
 * - REST API for document operations
 * - WebSocket support for collaboration
 */

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

// Import routes
const documentsRouter = require('./routes/documents');
const schemasRouter = require('./routes/schemas');
const templatesRouter = require('./routes/templates');
const collaborationRouter = require('./routes/collaboration');

// Import services
const SchemaService = require('./services/schema-service');
const StorageService = require('./services/storage-service');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO for collaboration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize services
const schemaService = new SchemaService();
const storageService = new StorageService();

// Make services available to routes
app.set('schemaService', schemaService);
app.set('storageService', storageService);
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// API Routes
app.use('/api/documents', documentsRouter);
app.use('/api/schemas', schemasRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/collaboration', collaborationRouter);

// Document types endpoint (at root API level for convenience)
app.get('/api/document-types', (req, res) => {
  const schemaService = req.app.get('schemaService');
  const documentTypes = schemaService.getDocumentTypes();
  res.json(documentTypes);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from renderer directory
const rendererPath = path.join(__dirname, '../renderer');
app.use(express.static(rendererPath));

// Serve models directory for schema files
const modelsPath = path.join(__dirname, '../../models');
app.use('/models', express.static(modelsPath));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(rendererPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  });
});

// WebSocket handling for collaboration
io.on('connection', (socket) => {
  console.log('[WebSocket] Client connected:', socket.id);
  
  socket.on('join-session', (sessionId, userName) => {
    socket.join(sessionId);
    socket.data.sessionId = sessionId;
    socket.data.userName = userName;
    
    // Notify others in the session
    socket.to(sessionId).emit('user-joined', {
      userId: socket.id,
      userName,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[WebSocket] ${userName} joined session ${sessionId}`);
  });
  
  socket.on('leave-session', () => {
    const { sessionId, userName } = socket.data;
    if (sessionId) {
      socket.leave(sessionId);
      socket.to(sessionId).emit('user-left', {
        userId: socket.id,
        userName,
        timestamp: new Date().toISOString()
      });
      console.log(`[WebSocket] ${userName} left session ${sessionId}`);
    }
  });
  
  socket.on('document-update', (update) => {
    const { sessionId, userName } = socket.data;
    if (sessionId) {
      socket.to(sessionId).emit('document-update', {
        ...update,
        userId: socket.id,
        userName,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  socket.on('cursor-update', (cursorData) => {
    const { sessionId, userName } = socket.data;
    if (sessionId) {
      socket.to(sessionId).emit('cursor-update', {
        ...cursorData,
        userId: socket.id,
        userName
      });
    }
  });
  
  socket.on('disconnect', () => {
    const { sessionId, userName } = socket.data;
    if (sessionId) {
      socket.to(sessionId).emit('user-left', {
        userId: socket.id,
        userName,
        timestamp: new Date().toISOString()
      });
    }
    console.log('[WebSocket] Client disconnected:', socket.id);
  });
});

// Initialize services and start server
async function start(port = 3000) {
  try {
    // Initialize schema service
    await schemaService.initialize();
    console.log('[Server] Schema service initialized');
    
    // Start listening
    server.listen(port, () => {
      console.log(`[Server] MDWriter web server running at http://localhost:${port}`);
      console.log(`[Server] API endpoints available at http://localhost:${port}/api`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  const port = process.env.PORT || 3000;
  start(port);
}

module.exports = { app, server, start };
