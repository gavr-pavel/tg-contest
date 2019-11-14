import {intRand, storage} from './utils.js';

const DC_LIST = ['', 'pluto', 'venus', 'aurora', 'vesta', 'flora'];

function chooseDC(dcId) {
  const storedDcId = storage.get('auth_dc_id');
  if (!dcId) {
    if (storedDcId) {
      dcId = storedDcId;
    } else {
      dcId = intRand(1, 5);
    }
  }
  if (dcId !== storedDcId) {
    storage.set('auth_dc_id', dcId);
  }
  return DC_LIST[dcId];
}

class Transport {
  getHost(dcId = 0, upload = false) {
    return chooseDC(dcId) + (upload ? '-1' : '');
  }
}

class WebSocketTransport extends Transport {
  pending = [];

  constructor({dcId, onMessage, onReconnect} = {}) {
    super();

    this.url = this.getUrl(dcId);

    this.messageCallback = onMessage;
    this.onReconnect = onReconnect;

    this.initSocket();
  }

  getUrl(dcId = 0) {
    return `wss://${this.getHost(dcId)}.web.telegram.org/apiws`;
  }

  initSocket() {
    const socket = new WebSocket(this.url, 'binary');

    this.socketReadyPromise = new Promise((resolve) => {
      socket.addEventListener('open', (event) => {
        console.log('ws open');
        this.socket = socket;
        resolve(socket);
      }, {once: true});
    });

    socket.addEventListener('error', (event) => {
      console.warn('ws error', event);
    });

    socket.addEventListener('message', (event) => {
      this.handleResponse(event.data);
    });

    socket.addEventListener('close', (event) => {
      console.log('ws close', event);
      this.socket = null;
      this.initSocket()
        .then(this.onReconnect);
    });

    return this.socketReadyPromise;
  }

  async handleResponse(message) {
    this.messageCallback(await message.arrayBuffer());
  }

  async send(payload) {
    if (!this.socket) {
      await this.socketReadyPromise;
    }
    this.socket.send(payload);
  }

  migrateDC(dcId) {
    this.url = this.getUrl(dcId);
    this.socket.close();
  }
}

class HttpTransport extends Transport {
  http = true;

  constructor({upload = false} = {}) {
    super();
    const host = this.getHost(upload);
    this.url = `https://${host}.web.telegram.org/apiw1`;
  }

  async send(payload) {
    const res = await fetch(this.url, {
      method: 'POST',
      mode: 'cors',
      body: payload,
    });

    if (!res.ok) {
      throw new Error(`Fetch error. Status: ${res.status} ${res.statusText}`);
    }

    return res.arrayBuffer();
  }
}

export {
  WebSocketTransport,
  HttpTransport
};
