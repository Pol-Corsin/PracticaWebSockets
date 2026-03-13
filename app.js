

//  Detecció automàtica de l'origen 
let domini = window.location.protocol == "file:" ? "localhost" : window.location.hostname;

// Protocol: ws:// per defecte. Canvia a wss:// per connexions segures.
const WS_URL = `wss://tu-app.railway.app`; // url

//  Colors disponibles 
const COLORS = [
  '#000000', '#ffffff', '#e94560', '#f5a623',
  '#f8e71c', '#7ed321', '#4a90e2', '#9b59b6',
  '#795548', '#607d8b'
];

//  Estat del dibuix 
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = '#000000';
let currentLineWidth = 4;

//  Elements del DOM 
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const lineWidthInput = document.getElementById('lineWidth');
const clearBtn = document.getElementById('clearBtn');
const palette = document.getElementById('palette');

//  Ajustar mida del canvas 
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

//  Connexió WebSocket al servidor
const ws = new WebSocket(WS_URL);

ws.addEventListener('open', () => {
  console.log('[Client] Connectat a:', WS_URL);
  updateStatus('Connectat ✓', 'connected');
});

ws.addEventListener('close', () => {
  console.log('[Client] Desconnectat.');
  updateStatus('Desconnectat ✗', 'disconnected');
});

ws.addEventListener('error', () => {
  updateStatus('Error de connexió', 'error');
});

//  Recepció de missatges 
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'history') {
    // Redibuixar tot l'historial en connectar-se
    msg.history.forEach(drawStroke);

  } else if (msg.type === 'draw') {
    // Traç d'un altre client
    drawStroke(msg.data);

  } else if (msg.type === 'clear') {
    // Un altre client ha netejat
    clearCanvas();
  }
});

//  Dibuixar un segment al canvas 
function drawStroke(data) {
  ctx.beginPath();
  ctx.moveTo(data.lastX, data.lastY);
  ctx.lineTo(data.x, data.y);
  ctx.strokeStyle = data.color;
  ctx.lineWidth = data.lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

//  Netejar el canvas 
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//  Enviar traç al servidor 
function sendStroke(x, y) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'draw',
    data: { x, y, lastX, lastY, color: currentColor, lineWidth: currentLineWidth }
  }));
}

//  Actualitzar indicador d'estat 
function updateStatus(text, state) {
  statusEl.textContent = text;
  statusEl.className = state;
}

//  Events del ratolí 
canvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Dibuixar localment
  drawStroke({ x, y, lastX, lastY, color: currentColor, lineWidth: currentLineWidth });

  // Enviar al servidor
  sendStroke(x, y);

  lastX = x;
  lastY = y;
});

canvas.addEventListener('mouseup',    () => { isDrawing = false; });
canvas.addEventListener('mouseleave', () => { isDrawing = false; });

//  Paleta de colors 
COLORS.forEach((color) => {
  const swatch = document.createElement('div');
  swatch.className = 'swatch';
  swatch.style.backgroundColor = color;
  swatch.title = color;
  swatch.addEventListener('click', () => {
    currentColor = color;
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
  });
  palette.appendChild(swatch);
});
palette.firstChild.classList.add('active');

//  Control de gruix 
lineWidthInput.addEventListener('input', () => {
  currentLineWidth = parseInt(lineWidthInput.value, 10);
});

//  Botó de netejar 
clearBtn.addEventListener('click', () => {
  clearCanvas();
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'clear' }));
  }
});