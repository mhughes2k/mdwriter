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
  const closeModal = collabDialog.querySelector('.close-modal');
  
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
  
  // Listen for discovered sessions from main process
  window.electronAPI.onCollabSessionFound((event, session) => {
    console.log('[CollabManager] Session found:', session);
    addDiscoveredSession(session);
  });
  
  window.electronAPI.onCollabSessionLost((event, session) => {
    console.log('[CollabManager] Session lost:', session);
    removeDiscoveredSession(session);
  });
  
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
  
  try {
    updateStatus('Starting collaboration session...');
    
    const result = await window.electronAPI.collabHostSession(currentDocument, {
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
  
  try {
    // Start discovery
    await window.electronAPI.collabStartDiscovery();
    
    // Get existing sessions
    const result = await window.electronAPI.collabGetDiscoveredSessions();
    
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
  
  try {
    updateStatus('Joining session...');
    
    // Create collaboration client
    if (!collaborationClient) {
      collaborationClient = new CollaborationClient();
      
      // Setup event handlers
      collaborationClient.onConnected = ({ document, version, users, metadata }) => {
        console.log('[CollabManager] Connected to session');
        currentDocument = document;
        currentCollabSession = { ...session, metadata, users };
        renderDocument();
        updateActiveSessionUI();
        updateStatus(`Joined session: ${metadata.title}`);
        updateCollabStatus('online', `Connected: ${metadata.title}`);
      };
      
      collaborationClient.onDocumentUpdated = ({ operation, version, userId }) => {
        console.log('[CollabManager] Document updated by', userId);
        applyRemoteOperation(operation);
      };
      
      collaborationClient.onUserJoined = (user) => {
        console.log('[CollabManager] User joined:', user.name);
        updateActiveSessionUI();
      };
      
      collaborationClient.onUserLeft = ({ userId }) => {
        console.log('[CollabManager] User left:', userId);
        updateActiveSessionUI();
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
    updateStatus('Failed to join session');
    alert('Failed to join session: ' + err.message);
  }
}

async function leaveSession() {
  if (collaborationClient) {
    collaborationClient.disconnect();
    collaborationClient = null;
  }
  
  if (isHosting) {
    await window.electronAPI.collabStopHosting();
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
  
  // Get current session info
  let session;
  if (isHosting) {
    const result = await window.electronAPI.collabGetCurrentSession();
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
    switch (operation.type) {
      case 'set':
        setValueAtPath(currentDocument, operation.path, operation.value);
        break;
      case 'array-insert':
        insertArrayItem(currentDocument, operation.path, operation.value, operation.index);
        break;
      case 'array-remove':
        removeArrayItem(currentDocument, operation.path, operation.index);
        break;
    }
    
    // Re-render the document
    renderDocument();
    
  } catch (err) {
    console.error('[CollabManager] Error applying remote operation:', err);
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

// Export for use in renderer.js
if (typeof window !== 'undefined') {
  window.initCollaboration = initCollaboration;
  window.collaborationClient = collaborationClient;
}
