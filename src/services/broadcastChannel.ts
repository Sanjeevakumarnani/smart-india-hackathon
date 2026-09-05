import { QueueToken } from '../types';

export interface KioskBroadcastMessage {
  type: 'RED_FLAG_TRIGGERED' | 'TOKEN_CREATED' | 'TOKEN_STATUS_UPDATED' | 'SYNC_REQUEST';
  token?: QueueToken;
  patientName?: string;
  redFlagReason?: string;
  timestamp: string;
}

class BroadcastManager {
  private channel: BroadcastChannel | null = null;
  private listeners: ((msg: KioskBroadcastMessage) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('medikiosk_channel');
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported:', e);
      }
    }

    // Fallback to storage events for browsers where BroadcastChannel is constrained
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'medikiosk_broadcast_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch (err) {
            console.warn('Storage broadcast parse error', err);
          }
        }
      });
    }
  }

  public postMessage(msg: KioskBroadcastMessage) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('medikiosk_broadcast_event', JSON.stringify({ ...msg, _t: Date.now() }));
    }
    this.notifyListeners(msg);
  }

  public subscribe(callback: (msg: KioskBroadcastMessage) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(msg: KioskBroadcastMessage) {
    this.listeners.forEach((l) => {
      try {
        l(msg);
      } catch (e) {
        console.error('Error in broadcast listener:', e);
      }
    });
  }
}

export const broadcastManager = new BroadcastManager();
