const API_HOST = 'venus';

class Transport {
  getHost(upload) {
    return API_HOST + (upload ? '-1' : '');
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

class WebSocketTransport extends Transport {
  pending = [];

  constructor({upload = false, onMessage} = {}) {
    super();

    const host = this.getHost(upload);
    this.url = `wss://${host}.web.telegram.org/apiws`;

    this.messageCallback = onMessage;

    const socket = new WebSocket(this.url, 'binary');

    this.socketReadyPromise = new Promise(resolve => {
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
      console.warn('ws close', event);
    });
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

  listen(callback) {
    this.messageCallback = callback;
  }
}

export {
  WebSocketTransport,
  HttpTransport
};
