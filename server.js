const http = require('http');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const room = 'demo';
const timelineCount = 4;
const presenterKey = process.env.PRESENTER_KEY || 'demo-presenter-key';

let selectedTimelineIndex = 0;
const clients = new Map();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function isValidIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < timelineCount;
}

function send(client, message) {
  if (client.readyState === client.OPEN) {
    client.send(JSON.stringify(message));
  }
}

function broadcastState() {
  const message = {
    type: 'state',
    room,
    index: selectedTimelineIndex,
  };

  for (const [client, meta] of clients) {
    if (meta.room === room) {
      send(client, message);
    }
  }
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (client) => {
      wss.emit('connection', client, req);
    });
  });

  wss.on('connection', (client) => {
    clients.set(client, { room, isPresenter: false });

    send(client, {
      type: 'state',
      room,
      index: selectedTimelineIndex,
    });

    client.on('message', (data) => {
      let message;

      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (message.type === 'hello') {
        const isPresenter =
          message.room === room &&
          typeof message.presenterKey === 'string' &&
          message.presenterKey === presenterKey;

        clients.set(client, { room, isPresenter });

        send(client, {
          type: 'state',
          room,
          index: selectedTimelineIndex,
        });
        return;
      }

      if (message.type === 'selectTimeline') {
        const meta = clients.get(client);

        if (!meta?.isPresenter) {
          send(client, {
            type: 'error',
            message: 'unauthorized',
          });
          return;
        }

        if (message.room !== room || !isValidIndex(message.index)) {
          return;
        }

        selectedTimelineIndex = message.index;
        broadcastState();
      }
    });

    client.on('close', () => {
      clients.delete(client);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
