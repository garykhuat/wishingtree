import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Wish, EventSettings } from '../types';

type WebSocketEventHandler = (payload: any) => void;

class RealtimeManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<WebSocketEventHandler>> = new Map();
  private isIntentionalClose = false;
  private hasInitializedFirestore = false;
  private knownWishIds: Set<string> = new Set();
  private isFirstSnapshot = true;

  constructor() {
    this.initFirestoreRealtime();
    this.initWebSocketFallback();
  }

  // Firestore real-time listener (Native, works everywhere including GitHub Pages!)
  private initFirestoreRealtime() {
    if (!isFirebaseConfigured || this.hasInitializedFirestore) return;
    this.hasInitializedFirestore = true;

    try {
      // 1. Listen to Wishes collection
      const wishesCol = collection(db, 'wishes');
      onSnapshot(
        wishesCol,
        (snapshot) => {
          if (this.isFirstSnapshot) {
            // Seed known IDs so initial load doesn't trigger "new wish" sound/pulse for all
            snapshot.docs.forEach((d) => this.knownWishIds.add(d.id));
            this.isFirstSnapshot = false;
            return;
          }

          const approvedCount = snapshot.docs.filter((d) => (d.data() as Wish).status === 'approved').length;

          snapshot.docChanges().forEach((change) => {
            const wish = change.doc.data() as Wish;

            if (change.type === 'added') {
              this.knownWishIds.add(wish.id);
              if (wish.status === 'approved') {
                this.emit('wish:new_approved', {
                  wish,
                  totalApproved: approvedCount,
                });
              } else {
                this.emit('wish:new_pending', {
                  wish,
                  totalPending: snapshot.docs.filter((d) => (d.data() as Wish).status === 'pending').length,
                });
              }
            } else if (change.type === 'modified') {
              this.emit('wish:status_changed', {
                wish,
                totalApproved: approvedCount,
              });
            } else if (change.type === 'removed') {
              this.knownWishIds.delete(wish.id);
              this.emit('wish:deleted', { id: wish.id });
            }
          });
        },
        (error) => {
          console.warn('Firestore real-time listener notice:', error.message);
        }
      );

      // 2. Listen to Settings document
      const settingsDoc = doc(db, 'settings', 'default');
      onSnapshot(
        settingsDoc,
        (snapshot) => {
          if (snapshot.exists()) {
            this.emit('settings:updated', snapshot.data() as EventSettings);
          }
        },
        (error) => {
          console.warn('Firestore settings listener notice:', error.message);
        }
      );

      // Firestore is active and real-time
      this.emit('connection:change', { connected: true });
    } catch (err) {
      console.warn('Could not initialize Firestore realtime listener:', err);
    }
  }

  // WebSocket fallback for local development or custom proxy
  private initWebSocketFallback() {
    if (typeof window === 'undefined') return;

    // Do not attempt WS if running on GitHub Pages
    if (window.location.hostname.includes('github.io')) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.emit('connection:change', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.type) {
            this.emit(msg.type, msg.data);
          }
        } catch {
          // ignore
        }
      };

      this.ws.onclose = () => {
        // Keep connected state if Firestore is active
        if (!isFirebaseConfigured) {
          this.emit('connection:change', { connected: false });
        }
      };

      this.ws.onerror = () => {
        // Silent failure if on static host
      };
    } catch {
      // ignore
    }
  }

  public on(event: string, handler: WebSocketEventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  public emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }

  public isConnected(): boolean {
    return isFirebaseConfigured || (this.ws !== null && this.ws.readyState === WebSocket.OPEN);
  }
}

export const realtime = new RealtimeManager();

export function useRealtimeEvent(event: string, handler: WebSocketEventHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsub = realtime.on(event, (data) => {
      handlerRef.current(data);
    });
    return unsub;
  }, [event]);
}

export function useRealtimeConnection() {
  const [connected, setConnected] = useState<boolean>(realtime.isConnected());

  useEffect(() => {
    const unsub = realtime.on('connection:change', (data) => {
      setConnected(data.connected);
    });
    return unsub;
  }, []);

  return connected;
}
