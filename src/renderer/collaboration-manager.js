/**
 * Collaboration Manager
 * 
 * Manages collaboration UI and integrates with collaboration client
 */

let collaborationClient = null;
let discoveredSessions = [];
let currentCollabSession = null;
let isHosting = false;
let hostedSessionId = null;

// Initialize collaboration UI
function initCollaboration() {
  const collabBtn = document.getElementById('collab-btn');
  const collabDialog = document.getElementById('collab-dialog');
  const closeModal = collabDialog.querySelector('.modal-close');
  
  // Check if we have the platform API or electronAPI
  const api = window.platformAPI || window.electronAPI;
  
  // Open collaboration dialog
  collabBtn.addEventListener('click', () => {
    collabDialog.style.display = 'flex';
    updateActiveSessionUI();
  });
  
  // Close dialog
  closeModal.addEventListener('click', () => {
    collabDialog.style.display = 'none';
  });
  
  // Close on background click
  collabDialog.addEventListener('click', (e) => {
    if (e.target === collabDialog) {
      collabDialog.style.display = 'none';
    }
  });
  
  // Tab switching
  const collabTabs = document.querySelectorAll('.collab-tab');
  collabTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchCollabTab(tabName);
    });
  });
  
  // Host session
  document.getElementById('start-hosting-btn').addEventListener('click', startHosting);
  
  // Refresh sessions
  document.getElementById('refresh-sessions-btn').addEventListener('click', refreshSessions);
  
  // Leave session
  document.getElementById('leave-session-btn').addEventListener('click', leaveSession);
  
  // Listen for discovered sessions from main process (Electron only)
  if (window.electronAPI && window.electronAPI.onCollabSessionFound) {
    window.electronAPI.onCollabSessionFound((event, session) => {
      console.log('[CollabManager] Session found:', session);
      addDiscoveredSession(session);
    });
    
    window.electronAPI.onCollabSessionLost((event, session) => {
      console.log('[CollabManager] Session lost:', session);
      removeDiscoveredSession(session);
    });
  }
  
  // Start discovery when opening join tab
  refreshSessions();
}

function switchCollabTab(tabName) {
  // Update tabs
  document.querySelectorAll('.collab-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update content
  document.querySelectorAll('.collab-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });
  
  if (tabName === 'join') {
    refreshSessions();
  } else if (tabName === 'active') {
    updateActiveSessionUI();
  }
}

async function startHosting() {
  if (!currentDocument) {
    alert('Please open a document first');
    return;
  }
  
  const sessionName = document.getElementById('session-name').value.trim();
  const userName = document.getElementById('host-user-name').value.trim();
  
  if (!sessionName) {
    alert('Please enter a session name');
    return;
  }
  
  if (!userName) {
    alert('Please enter your name');
    return;
  }
  
  // Get API (prefer platformAPI for cross-platform, fall back to electronAPI)
  const api = window.platformAPI || window.electronAPI;
  if (!api) {
    alert('Collaboration API not available');
    return;
  }
  
  try {
    updateStatus('Starting collaboration session...');
    
    const result = await api.collabHostSession(currentDocument, {
      title: sessionName,
      documentType: documentType,
      hostName: userName
    });
    
    if (result.success) {
      isHosting = true;
      hostedSessionId = result.session.sessionId;
      currentCollabSession = result.session;
      
      updateStatus(`Hosting session: ${sessionName}`);
      updateCollabStatus('hosting', `Hosting: ${sessionName}`);
      
      // Host should also connect as a client to send/receive updates
      try {
        // Create collaboration client for the host
        if (!collaborationClient) {
          collaborationClient = new CollaborationClient();
          
          // Setup event handlers
          collaborationClient.onConnected = async ({ document, version, users, metadata }) => {
            console.log('[CollabManager] Host connected to own session');
            // Update current session with users list
            if (currentCollabSession) {
              currentCollabSession.users = users;
            }
            updateActiveSessionUI();
          };
          
          collaborationClient.onDocumentUpdated = ({ operation, version, userId }) => {
            console.log('[CollabManager] Document updated by', userId);
            applyRemoteOperation(operation);
          };
          
          collaborationClient.onUserJoined = (user) => {
            console.log('[CollabManager] User joined:', user);
            // Add user to current session
            if (currentCollabSession && currentCollabSession.users) {
              currentCollabSession.users.push(user);
            }
            updateActiveSessionUI();
          };
          
          collaborationClient.onUserLeft = ({ userId }) => {
            console.log('[CollabManager] User left:', userId);
            removeUserPresenceIndicators(userId);
            updateActiveSessionUI();
          };
          
          collaborationClient.onCursorUpdated = ({ userId, cursor }) => {
            updateUserPresence(userId, cursor);
          };
          
          collaborationClient.onDisconnected = ({ reason }) => {
            console.log('[CollabManager] Disconnected:', reason);
          };
        }
        
        // Connect to own server on localhost
        await collaborationClient.connect('localhost', result.session.port, result.session.sessionId, {
          name: userName
        });
        
        console.log('[CollabManager] Host connected as client');
      } catch (err) {
        console.error('[CollabManager] Error connecting host as client:', err);
      }
      
      switchCollabTab('active');
      updateActiveSessionUI();
    } else {
      updateStatus('Failed to start session: ' + result.error);
    }
  } catch (err) {
    console.error('[CollabManager] Error starting session:', err);
    updateStatus('Error starting collaboration');
  }
}

async function refreshSessions() {
  const sessionsList = document.getElementById('sessions-list');
  sessionsList.innerHTML = '<p class="placeholder">Searching for sessions...</p>';
  
  // Get API (prefer platformAPI for cross-platform, fall back to electronAPI)
  const api = window.platformAPI || window.electronAPI;
  if (!api) {
    sessionsList.innerHTML = '<p class="placeholder">API not available</p>';
    return;
  }
  
  try {
    // Start discovery
    await api.collabStartDiscovery();
    
    // Get existing sessions
    const result = await api.collabGetDiscoveredSessions();
    
    if (result.success) {
      discoveredSessions = result.sessions || [];
      renderSessionsList();
    }
  } catch (err) {
    console.error('[CollabManager] Error refreshing sessions:', err);
    sessionsList.innerHTML = '<p class="placeholder">Error loading sessions</p>';
  }
}

function renderSessionsList() {
  const sessionsList = document.getElementById('sessions-list');
  
  // Filter out self-hosted sessions
  const availableSessions = discoveredSessions.filter(session => session.id !== hostedSessionId);
  
  if (isHosting) {
    sessionsList.innerHTML = '<p class="placeholder">Cannot join sessions while hosting. Please stop hosting first.</p>';
    return;
  }
  
  if (availableSessions.length === 0) {
    sessionsList.innerHTML = '<p class="placeholder">No sessions found</p>';
    return;
  }
  
  sessionsList.innerHTML = '';
  
  availableSessions.forEach(session => {
    const item = document.createElement('div');
    item.className = 'session-item';
    item.innerHTML = `
      <div class="session-title">${session.metadata.title}</div>
      <div class="session-meta">
        Host: ${session.metadata.hostName} | 
        ${session.host}:${session.port}
      </div>
    `;
    
    item.addEventListener('click', () => joinSession(session));
    
    sessionsList.appendChild(item);
  });
}

async function joinSession(session) {
  if (isHosting) {
    alert('Cannot join a session while hosting. Please stop hosting first.');
    return;
  }
  
  const userName = document.getElementById('join-user-name').value.trim();
  
  if (!userName) {
    alert('Please enter your name');
    return;
  }

  console.log('[CollabManager] Attempting to join session:', session);
  
  try {
    updateStatus('Joining session...');
    
    // Create collaboration client
    if (!collaborationClient) {
      collaborationClient = new CollaborationClient();
      
      // Setup event handlers
      collaborationClient.onConnected = async ({ document, version, users, metadata }) => {
        console.log('[CollabManager] Connected to session');
        console.log('[CollabManager] Received document:', document);
        
        // Update global state (these variables are defined in renderer.js)
        window.currentDocument = currentDocument = document;
        window.documentType = documentType = document.metadata.documentType || 'mdf';
        currentCollabSession = { ...session, metadata, users };
        
        // Load schema structure before rendering
        try {
          // Get API (prefer platformAPI for cross-platform, fall back to electronAPI)
          const api = window.platformAPI || window.electronAPI;
          console.log('[CollabManager] Loading schema for documentType:', documentType);
          const structure = await api.getSchemaStructure(documentType);
          window.schemaProperties = schemaProperties = structure;
          console.log('[CollabManager] Schema loaded, properties count:', schemaProperties.length);
          console.log('[CollabManager] Rendering document...');
          await renderDocument();
          console.log('[CollabManager] Document rendered');
        } catch (err) {
          console.error('[CollabManager] Error loading schema:', err);
          updateStatus('Error loading document schema');
        }
        
        updateActiveSessionUI();
        updateStatus(`Joined session: ${metadata.title}`);
        updateCollabStatus('online', `Connected: ${metadata.title}`);
      };
      
      collaborationClient.onDocumentUpdated = ({ operation, version, userId }) => {
        console.log('[CollabManager] Document updated by', userId);
        applyRemoteOperation(operation);
      };
      
      collaborationClient.onUserJoined = (user) => {
        console.log('[CollabManager] User joined:', user);
        // Add user to current session
        if (currentCollabSession && currentCollabSession.users) {
          currentCollabSession.users.push(user);
        }
        updateActiveSessionUI();
      };
      
      collaborationClient.onUserLeft = ({ userId }) => {
        console.log('[CollabManager] User left:', userId);
        // Remove user from current session
        if (currentCollabSession && currentCollabSession.users) {
          currentCollabSession.users = currentCollabSession.users.filter(u => u.id !== userId);
        }
        removeUserPresenceIndicators(userId);
        updateActiveSessionUI();
      };
      
      collaborationClient.onCursorUpdated = ({ userId, cursor }) => {
        updateUserPresence(userId, cursor);
      };
      
      collaborationClient.onDisconnected = ({ reason }) => {
        console.log('[CollabManager] Disconnected:', reason);
        updateStatus('Disconnected from session');
        updateCollabStatus('', '');
        currentCollabSession = null;
      };
    }
    
    await collaborationClient.connect(session.host, session.port, session.id, {
      name: userName
    });
    
    switchCollabTab('active');
    
  } catch (err) {
    console.error('[CollabManager] Error joining session:', err);
    console.error('[CollabManager] Error details:', {
      message: err.message,
      stack: err.stack,
      session: session
    });
    updateStatus('Failed to join session: ' + err.message);
    alert('Failed to join session: ' + err.message);
  }
}

async function leaveSession() {
  if (collaborationClient) {
    collaborationClient.disconnect();
    collaborationClient = null;
  }
  
  // Get API (prefer platformAPI for cross-platform, fall back to electronAPI)
  const api = window.platformAPI || window.electronAPI;
  
  if (isHosting && api) {
    await api.collabStopHosting();
    isHosting = false;
    hostedSessionId = null;
  }
  
  currentCollabSession = null;
  updateCollabStatus('', '');
  updateStatus('Left collaboration session');
  
  // Refresh sessions list to remove hosting restriction
  renderSessionsList();
  
  document.getElementById('collab-dialog').style.display = 'none';
}

async function updateActiveSessionUI() {
  const sessionInfo = document.getElementById('session-info');
  const usersList = document.getElementById('users-list');
  const leaveBtn = document.getElementById('leave-session-btn');
  
  if (!currentCollabSession && !isHosting) {
    sessionInfo.innerHTML = '<p class="placeholder">No active session</p>';
    usersList.innerHTML = '';
    leaveBtn.style.display = 'none';
    return;
  }
  
  // Get API (prefer platformAPI for cross-platform, fall back to electronAPI)
  const api = window.platformAPI || window.electronAPI;
  
  // Get current session info
  let session;
  if (isHosting && api) {
    const result = await api.collabGetCurrentSession();
    session = result.session;
  } else {
    session = currentCollabSession;
  }
  
  if (!session) {
    sessionInfo.innerHTML = '<p class="placeholder">No active session</p>';
    usersList.innerHTML = '';
    leaveBtn.style.display = 'none';
    return;
  }
  
  // Display session info
  sessionInfo.innerHTML = `
    <div class="form-group">
      <label>Session Name:</label>
      <div>${session.metadata.title}</div>
    </div>
    <div class="form-group">
      <label>Host:</label>
      <div>${session.metadata.hostName}</div>
    </div>
    <div class="form-group">
      <label>Users Connected:</label>
      <div>${session.users?.length || 0}</div>
    </div>
  `;
  
  // Display users
  if (session.users && session.users.length > 0) {
    usersList.innerHTML = '<h4>Connected Users:</h4>';
    session.users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      userItem.innerHTML = `
        <div class="user-color" style="background: ${user.color}"></div>
        <div class="user-name">${user.name}</div>
      `;
      usersList.appendChild(userItem);
    });
  } else {
    usersList.innerHTML = '';
  }
  
  leaveBtn.style.display = 'block';
}

function addDiscoveredSession(session) {
  const existing = discoveredSessions.find(s => s.id === session.id);
  if (!existing) {
    discoveredSessions.push(session);
    renderSessionsList();
  }
}

function removeDiscoveredSession(session) {
  discoveredSessions = discoveredSessions.filter(s => s.id !== session.id);
  renderSessionsList();
}

function updateCollabStatus(className, text) {
  const status = document.getElementById('collab-status');
  status.className = 'collab-status ' + className;
  status.textContent = text;
}

function applyRemoteOperation(operation) {
  // Apply the operation to currentDocument
  // This will be called when another user makes a change
  try {
    console.log('[CollabManager] Applying remote operation:', operation);
    
    switch (operation.type) {
      case 'set':
        setValueAtPath(currentDocument, operation.path, operation.value);
        // Update the UI field directly instead of re-rendering everything
        updateFieldInUI(operation.path, operation.value);
        break;
      case 'array-insert':
        insertArrayItem(currentDocument, operation.path, operation.value, operation.index);
        // For arrays, we need to re-render
        renderDocument();
        break;
      case 'array-remove':
        removeArrayItem(currentDocument, operation.path, operation.index);
        // For arrays, we need to re-render
        renderDocument();
        break;
    }
    
  } catch (err) {
    console.error('[CollabManager] Error applying remote operation:', err);
  }
}

function updateFieldInUI(path, value) {
  // Remove 'data.' prefix if present
  const fieldPath = path.startsWith('data.') ? path.substring(5) : path;
  
  console.log('[CollabManager] Looking for field with path:', fieldPath);
  
  // Check if this is a custom form field
  if (typeof formGenerator !== 'undefined' && formGenerator && formGenerator.customFormInstances) {
    const customForm = formGenerator.customFormInstances.get(fieldPath);
    if (customForm) {
      console.log('[CollabManager] Updating custom form:', fieldPath);
      customForm.setValue(value);
      console.log('[CollabManager] Updated custom form field:', fieldPath, 'to value:', value);
      return;
    }
  }
  
  // Find the standard input element with this field path
  let input = document.querySelector(`input[data-field-path="${fieldPath}"]`);
  if (!input) {
    input = document.querySelector(`textarea[data-field-path="${fieldPath}"]`);
  }
  if (!input) {
    input = document.querySelector(`select[data-field-path="${fieldPath}"]`);
  }
  
  console.log('[CollabManager] Found input:', input);
  
  if (input) {
    console.log('[CollabManager] Input type:', input.type, 'tagName:', input.tagName);
    if (input.type === 'checkbox') {
      input.checked = value;
    } else if (input.tagName === 'TEXTAREA' || input.type === 'text' || input.type === 'number') {
      input.value = value || '';
    } else {
      input.value = value;
    }
    console.log('[CollabManager] Updated field in UI:', fieldPath, 'to value:', value);
  } else {
    console.warn('[CollabManager] Could not find input for path:', fieldPath);
    // Try to list all inputs with data-field-path
    const allInputs = document.querySelectorAll('input[data-field-path], textarea[data-field-path]');
    console.log('[CollabManager] Available field paths:', Array.from(allInputs).map(i => i.dataset.fieldPath));
  }
}

function setValueAtPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
}

function insertArrayItem(obj, path, value, index) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    current = current[part];
  }
  
  if (Array.isArray(current)) {
    current.splice(index, 0, value);
  }
}

function removeArrayItem(obj, path, index) {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    current = current[part];
  }
  
  if (Array.isArray(current)) {
    current.splice(index, 1);
  }
}

// Track user presence (fieldPath -> Set of userIds)
const userPresence = new Map();

/**
 * Update user presence indicator
 */
function updateUserPresence(userId, cursor) {
  console.log('[CollabManager] updateUserPresence called:', { userId, cursor, session: currentCollabSession });
  
  if (!cursor || !cursor.fieldPath) {
    removeUserPresenceIndicators(userId);
    return;
  }
  
  const user = currentCollabSession?.users?.find(u => u.id === userId);
  console.log('[CollabManager] Found user:', user);
  
  if (!user) {
    console.warn('[CollabManager] User not found in session. Available users:', currentCollabSession?.users);
    return;
  }
  
  // Remove old indicators for this user from ALL fields
  // (user moved from one field to another)
  removeUserPresenceIndicators(userId);
  
  // Add user to presence map for new field
  if (!userPresence.has(cursor.fieldPath)) {
    userPresence.set(cursor.fieldPath, new Set());
  }
  userPresence.get(cursor.fieldPath).add(userId);
  
  // Add field indicator in the editor
  const fieldPath = cursor.fieldPath;
  let input = document.querySelector(`input[data-field-path="${fieldPath}"]`);
  if (!input) input = document.querySelector(`textarea[data-field-path="${fieldPath}"]`);
  if (!input) input = document.querySelector(`select[data-field-path="${fieldPath}"]`);
  
  if (input) {
    // Add indicator to the field
    const container = input.closest('.form-field');
    if (container) {
      let indicator = container.querySelector('.user-presence-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'user-presence-indicator';
        container.appendChild(indicator);
      }
      
      // Check if this user already has a badge here (shouldn't happen but just in case)
      const existingBadge = indicator.querySelector(`[data-user-id="${userId}"]`);
      if (existingBadge) {
        existingBadge.remove();
      }
      
      // Add user badge
      const badge = document.createElement('span');
      badge.className = 'user-badge';
      badge.style.backgroundColor = user.color;
      badge.textContent = user.name.charAt(0).toUpperCase();
      badge.title = user.name;
      badge.dataset.userId = userId;
      indicator.appendChild(badge);
      
      // Highlight the input with the user's color
      // If multiple users are on same field, show the most recent one's color
      input.style.borderColor = user.color;
      input.style.borderWidth = '2px';
      input.dataset.activeUser = userId;
    }
  }
  
  // Add indicator to document outline/structure
  const outlineItem = document.querySelector(`.outline-item[data-field="${fieldPath}"]`);
  if (outlineItem) {
    let outlineIndicator = outlineItem.querySelector('.user-presence-indicator');
    if (!outlineIndicator) {
      outlineIndicator = document.createElement('span');
      outlineIndicator.className = 'user-presence-indicator outline-presence';
      outlineItem.appendChild(outlineIndicator);
    }
    
    // Check if this user already has a badge here
    const existingOutlineBadge = outlineIndicator.querySelector(`[data-user-id="${userId}"]`);
    if (existingOutlineBadge) {
      existingOutlineBadge.remove();
    }
    
    // Add user badge to outline
    const outlineBadge = document.createElement('span');
    outlineBadge.className = 'user-badge';
    outlineBadge.style.backgroundColor = user.color;
    outlineBadge.textContent = user.name.charAt(0).toUpperCase();
    outlineBadge.title = user.name;
    outlineBadge.dataset.userId = userId;
    outlineIndicator.appendChild(outlineBadge);
  }
}

/**
 * Remove all presence indicators for a user
 */
function removeUserPresenceIndicators(userId) {
  // Remove from presence map
  for (const [fieldPath, users] of userPresence.entries()) {
    users.delete(userId);
    if (users.size === 0) {
      userPresence.delete(fieldPath);
    }
  }
  
  // Remove badges
  document.querySelectorAll(`.user-badge[data-user-id="${userId}"]`).forEach(badge => {
    badge.remove();
  });
  
  // Remove input highlighting
  document.querySelectorAll(`[data-active-user="${userId}"]`).forEach(input => {
    input.style.borderColor = '';
    input.style.borderWidth = '';
    delete input.dataset.activeUser;
  });
  
  // Clean up empty indicators
  document.querySelectorAll('.user-presence-indicator').forEach(indicator => {
    if (indicator.children.length === 0) {
      indicator.remove();
    }
  });
}

/**
 * Send cursor update when user focuses on a field
 */
function sendCursorUpdate(fieldPath) {
  if (collaborationClient && collaborationClient.isConnected()) {
    collaborationClient.sendCursorUpdate({
      fieldPath: fieldPath,
      timestamp: Date.now()
    });
  }
}

// Export for use in renderer.js
if (typeof window !== 'undefined') {
  window.initCollaboration = initCollaboration;
  window.sendCursorUpdate = sendCursorUpdate;
  
  // Expose collaborationClient getter
  Object.defineProperty(window, 'collaborationClient', {
    get: function() { return collaborationClient; },
    set: function(value) { collaborationClient = value; }
  });
}
