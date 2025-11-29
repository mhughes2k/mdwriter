/**
 * Collaboration API Routes
 * 
 * REST endpoints for collaboration session management
 */

const express = require('express');
const router = express.Router();

// In-memory session storage (in production, use Redis or similar)
const sessions = new Map();

/**
 * GET /api/collaboration/sessions
 * List active collaboration sessions
 */
router.get('/sessions', async (req, res) => {
  const sessionList = Array.from(sessions.values()).map(session => ({
    sessionId: session.sessionId,
    name: session.name,
    hostName: session.hostName,
    documentType: session.documentType,
    userCount: session.users.size,
    createdAt: session.createdAt
  }));
  
  res.json({ success: true, sessions: sessionList });
});

/**
 * POST /api/collaboration/host
 * Create a new collaboration session
 */
router.post('/host', async (req, res) => {
  try {
    const { document, metadata } = req.body;
    
    if (!document) {
      return res.status(400).json({ success: false, error: 'Document is required' });
    }
    
    const sessionId = generateSessionId();
    const session = {
      sessionId,
      name: metadata?.name || 'Untitled Session',
      hostName: metadata?.hostName || 'Anonymous',
      documentType: document.metadata?.documentType,
      document,
      users: new Map(),
      createdAt: new Date().toISOString()
    };
    
    sessions.set(sessionId, session);
    
    res.json({ 
      success: true, 
      session: {
        sessionId,
        name: session.name,
        hostName: session.hostName,
        documentType: session.documentType,
        createdAt: session.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/collaboration/stop
 * Stop hosting a session
 */
router.post('/stop', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (sessionId && sessions.has(sessionId)) {
      // Notify all users via WebSocket
      const io = req.app.get('io');
      io.to(sessionId).emit('session-ended', { sessionId });
      
      sessions.delete(sessionId);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/collaboration/current
 * Get current session info
 */
router.get('/current', async (req, res) => {
  // In a real implementation, this would be based on user authentication
  // For now, return the first session (if any)
  const session = sessions.values().next().value;
  
  if (!session) {
    return res.json({ success: true, session: null });
  }
  
  res.json({
    success: true,
    session: {
      sessionId: session.sessionId,
      name: session.name,
      hostName: session.hostName,
      documentType: session.documentType,
      userCount: session.users.size,
      createdAt: session.createdAt
    }
  });
});

/**
 * GET /api/collaboration/sessions/:sessionId
 * Get specific session info
 */
router.get('/sessions/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  
  res.json({
    success: true,
    session: {
      sessionId: session.sessionId,
      name: session.name,
      hostName: session.hostName,
      documentType: session.documentType,
      userCount: session.users.size,
      users: Array.from(session.users.values()),
      createdAt: session.createdAt
    }
  });
});

/**
 * GET /api/collaboration/sessions/:sessionId/document
 * Get session document
 */
router.get('/sessions/:sessionId/document', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  
  res.json({
    success: true,
    document: session.document
  });
});

/**
 * Generate a unique session ID using crypto for security
 */
function generateSessionId() {
  const crypto = require('crypto');
  return 'sess_' + crypto.randomBytes(12).toString('hex');
}

module.exports = router;
