// ============================================================
// server.js – Servidor WebSocket per a la pissarra col·laborativa
// Utilitza la llibreria nativa 'ws' (sense socket.io)
// ============================================================

import { WebSocketServer, WebSocket } from 'ws';

// Port d'escolta del servidor
const PORT = 8180;

// Historial de traços en memòria (es perd en reiniciar el servidor)
const history = [];

// Creació del servidor WebSocket
const wss = new WebSocketServer({ port: PORT });

console.log(`[Servidor] Pissarra col·laborativa escoltant al port ${PORT}`);

// ─── Gestió de connexions ────────────────────────────────────
wss.on('connection', (socket) => {
  console.log(`[Servidor] Nou client connectat. Total: ${wss.clients.size}`);

  // En connectar-se, enviar l'historial complet al nou client
  socket.send(JSON.stringify({ type: 'history', history }));

  // ─── Gestió de missatges entrants ──────────────────────────
  socket.on('message', (rawData) => {
    try {
      const msg = JSON.parse(rawData.toString());

      if (msg.type === 'draw' && msg.data) {
        // Desar el traç a l'historial
        history.push(msg.data);

        // Broadcast: reenviar a tots els clients EXCEPTE l'emissor
        wss.clients.forEach((client) => {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
          }
        });

      } else if (msg.type === 'clear') {
        // Buidar l'historial
        history.length = 0;
        console.log('[Servidor] Canvas netejat.');

        // Notificar a tots els altres clients
        wss.clients.forEach((client) => {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'clear' }));
          }
        });
      }

    } catch (err) {
      console.error('[Servidor] Error parsejant missatge:', err);
    }
  });

  // ─── Gestió d'errors ───────────────────────────────────────
  socket.on('error', (err) => {
    console.error('[Servidor] Error al socket:', err.message);
  });

  // ─── Gestió de desconnexió ─────────────────────────────────
  socket.on('close', () => {
    console.log(`[Servidor] Client desconnectat. Total: ${wss.clients.size}`);
  });
});

wss.on('error', (err) => {
  console.error('[Servidor] Error crític:', err);
});