// Serveur Node.js pour Talka (chat aléatoire)
// Lance avec : node server.js

const http = require('http');
socket = new WebSocket('ws://192.168.1.28:3000'); // Mets ton IP ici

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let waitingUser = null; // { ws, userId }
const pairs = new Map(); // ws => ws

wss.on('connection', (ws) => {
    let userId = null;
    let pairedWith = null;

    ws.on('message', (data) => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }
        if (msg.type === 'join') {
            userId = msg.userId;
            if (waitingUser && waitingUser.ws.readyState === WebSocket.OPEN) {
                // Appariement
                pairs.set(ws, waitingUser.ws);
                pairs.set(waitingUser.ws, ws);
                ws.send(JSON.stringify({ type: 'matched' }));
                waitingUser.ws.send(JSON.stringify({ type: 'matched' }));
                pairedWith = waitingUser.ws;
                waitingUser = null;
            } else {
                waitingUser = { ws, userId };
            }
        } else if (msg.type === 'message' && pairedWith && pairedWith.readyState === WebSocket.OPEN) {
            pairedWith.send(JSON.stringify({ type: 'message', text: msg.text }));
        } else if (msg.type === 'swipe') {
            if (pairedWith && pairedWith.readyState === WebSocket.OPEN) {
                pairedWith.send(JSON.stringify({ type: 'swiped' }));
                pairs.delete(pairedWith);
                pairs.delete(ws);
            }
            pairedWith = null;
            if (waitingUser && waitingUser.ws === ws) waitingUser = null;
            if (waitingUser && waitingUser.ws.readyState !== WebSocket.OPEN) waitingUser = null;
            if (waitingUser && waitingUser.ws !== ws && waitingUser.ws.readyState === WebSocket.OPEN) {
                pairs.set(ws, waitingUser.ws);
                pairs.set(waitingUser.ws, ws);
                ws.send(JSON.stringify({ type: 'matched' }));
                waitingUser.ws.send(JSON.stringify({ type: 'matched' }));
                pairedWith = waitingUser.ws;
                waitingUser = null;
            } else {
                waitingUser = { ws, userId };
            }
        } else if (msg.type === 'leave') {
            if (pairedWith && pairedWith.readyState === WebSocket.OPEN) {
                pairedWith.send(JSON.stringify({ type: 'left' }));
                pairs.delete(pairedWith);
                pairs.delete(ws);
            }
            pairedWith = null;
            if (waitingUser && waitingUser.ws === ws) waitingUser = null;
        }
    });

    ws.on('close', () => {
        if (pairedWith && pairedWith.readyState === WebSocket.OPEN) {
            pairedWith.send(JSON.stringify({ type: 'left' }));
            pairs.delete(pairedWith);
            pairs.delete(ws);
        }
        if (waitingUser && waitingUser.ws === ws) waitingUser = null;
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log('Talka WebSocket server running on port', PORT);
});
