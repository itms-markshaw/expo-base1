
// Odoo 18 WebSocket Connection Example for React Native
// Based on successful test results

import { useState, useEffect, useRef } from 'react';

export function useOdooWebSocket() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  
  const connect = () => {
    const wsUrl = 'wss://itmsgroup.com.au/websocket';
    
    wsRef.current = new WebSocket(wsUrl, {
      headers: {
        'Cookie': 'frontend_lang=en_AU; Expires=Tue, 23 Jun 2026 07:31:26 GMT; Path=/; Secure; HttpOnly; SameSite=Lax; frontend_lang=en_AU; Expires=Tue, 23 Jun 2026 07:31:26 GMT; Path=/; Secure; HttpOnly; SameSite=Lax; session_id=qr_72peo_wN18k_r9tRfoLXuz8QgkCRnZOif2bCqIzg-0aBmgk9k2PMO2s0bwjxwrJa7RcPUC1dUG0PIr4FN; Expires=Tue, 23 Jun 2026 07:31:26 GMT; Max-Age=604800; HttpOnly; Path=/; Secure; HttpOnly; SameSite=Lax; Secure; SameSite=Lax',
        'Origin': 'https://itmsgroup.com.au'
      }
    });
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      
      // Send Odoo 18 subscription
      const subscription = {
        event_name: "subscribe",
        data: {
          channels: ["bus.bus"],
          last: 0
        }
      };
      
      wsRef.current.send(JSON.stringify(subscription));
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);
        setMessages(prev => [...prev, data]);
      } catch (error) {
        console.log('Raw WebSocket message:', event.data);
      }
    };
    
    wsRef.current.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setConnected(false);
    };
    
    wsRef.current.onerror = (error) => {
      console.log('WebSocket error:', error);
      setConnected(false);
    };
  };
  
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };
  
  useEffect(() => {
    return () => disconnect();
  }, []);
  
  return { connected, messages, connect, disconnect };
}
