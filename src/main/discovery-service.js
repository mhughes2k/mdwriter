const Bonjour = require('bonjour-service');
const os = require('os');

/**
 * Network Discovery Service
 * 
 * Uses mDNS (Bonjour/Zeroconf) to advertise and discover collaboration sessions
 * on the local network
 */
class DiscoveryService {
  constructor() {
    this.bonjour = new Bonjour.Bonjour();
    this.service = null;
    this.browser = null;
    this.sessions = new Map(); // Remote sessions discovered on network
  }

  /**
   * Advertise a collaboration session on the network
   * @param {Object} sessionInfo - Session information
   * @param {string} sessionInfo.id - Session ID
   * @param {number} sessionInfo.port - WebSocket server port
   * @param {Object} sessionInfo.metadata - Session metadata
   */
  advertiseSession(sessionInfo) {
    // Stop existing advertisement if any
    if (this.service) {
      this.service.stop();
    }

    const { id, port, metadata } = sessionInfo;

    this.service = this.bonjour.publish({
      name: metadata.title || 'MDWriter Session',
      type: 'mdwriter',
      port: port,
      txt: {
        sessionId: id,
        hostName: metadata.hostName || os.hostname(),
        documentType: metadata.documentType || 'mdf',
        createdAt: metadata.createdAt || Date.now().toString(),
        version: '1.0'
      }
    });

    console.log(`[Discovery] Advertising session ${id} on port ${port}`);
  }

  /**
   * Stop advertising the current session
   */
  stopAdvertising() {
    if (this.service) {
      this.service.stop();
      this.service = null;
      console.log('[Discovery] Stopped advertising');
    }
  }

  /**
   * Start browsing for sessions on the network
   * @param {Function} onSessionFound - Callback when session is found
   * @param {Function} onSessionLost - Callback when session is lost
   */
  startBrowsing(onSessionFound, onSessionLost) {
    if (this.browser) {
      this.browser.stop();
    }

    this.browser = this.bonjour.find({ type: 'mdwriter' });

    this.browser.on('up', (service) => {
      const session = this.parseService(service);
      this.sessions.set(session.id, session);
      console.log(`[Discovery] Found session: ${session.metadata.title} (${session.id})`);
      
      if (onSessionFound) {
        onSessionFound(session);
      }
    });

    this.browser.on('down', (service) => {
      const sessionId = service.txt?.sessionId;
      if (sessionId && this.sessions.has(sessionId)) {
        const session = this.sessions.get(sessionId);
        this.sessions.delete(sessionId);
        console.log(`[Discovery] Lost session: ${session.metadata.title} (${sessionId})`);
        
        if (onSessionLost) {
          onSessionLost(session);
        }
      }
    });

    console.log('[Discovery] Started browsing for sessions');
  }

  /**
   * Stop browsing for sessions
   */
  stopBrowsing() {
    if (this.browser) {
      this.browser.stop();
      this.browser = null;
      console.log('[Discovery] Stopped browsing');
    }
  }

  /**
   * Get all discovered sessions
   */
  getDiscoveredSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Parse Bonjour service into session object
   */
  parseService(service) {
    const addresses = service.addresses || [];
    // Prefer IPv4 addresses
    const address = addresses.find(addr => addr.includes('.')) || addresses[0];

    return {
      id: service.txt?.sessionId,
      host: address,
      port: service.port,
      metadata: {
        title: service.name,
        hostName: service.txt?.hostName || 'Unknown',
        documentType: service.txt?.documentType || 'mdf',
        createdAt: parseInt(service.txt?.createdAt || '0'),
        version: service.txt?.version || '1.0'
      }
    };
  }

  /**
   * Cleanup and stop all services
   */
  destroy() {
    this.stopAdvertising();
    this.stopBrowsing();
    this.bonjour.destroy();
    console.log('[Discovery] Service destroyed');
  }
}

module.exports = DiscoveryService;
