const DC_HOSTS = ['', 'pluto', 'venus', 'aurora', 'vesta', 'flora'];

class Transport {
  getHost(dcId) {
    return DC_HOSTS[dcId];
  }
}

class WebSocketTransport extends Transport {
  constructor({dcId, onMessage, onReconnect} = {}) {
    super();

    this.url = this.getUrl(dcId);

    this.messageCallback = onMessage;
    this.onReconnect = onReconnect;

    this.initSocket();
  }

  getUrl(dcId) {
    return `wss://${this.getHost(dcId)}.web.telegram.org/apiws`;
  }

  initSocket() {
    const socket = new WebSocket(this.url, 'binary');

    this.socketReadyPromise = new Promise((resolve) => {
      socket.addEventListener('open', (event) => {
        // console.log('ws open');
        this.socket = socket;
        resolve(socket);
      }, {once: true});
    });

    socket.addEventListener('message', this.onSocketMessage);
    socket.addEventListener('error', this.onSocketError);
    socket.addEventListener('close', this.onSocketClose);

    return this.socketReadyPromise;
  }

  onSocketMessage = (event) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      const buffer = event.target.result;
      this.messageCallback(buffer);
    };
    fileReader.readAsArrayBuffer(event.data);
  };

  onSocketError = (event) => {
    // console.warn('ws error', event);
  };

  onSocketClose = (event) => {
    // console.log('ws close', event);
    this.socket = null;
    this.initSocket()
      .then(this.onReconnect);
  };

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

  destroy() {
    this.socket.removeEventListener('message', this.onSocketMessage);
    this.socket.removeEventListener('error', this.onSocketError);
    this.socket.removeEventListener('close', this.onSocketClose);
    this.socket.close();
  }
}

class HttpTransport extends Transport {
  http = true;

  constructor({dcId}) {
    super();
    const host = this.getHost(dcId);
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
