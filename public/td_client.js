let client;

const listeners = new Set();

const options = new Map();

function onUpdate(update) {
  switch (update['@type']) {
    case 'updateOption':
      options.set(update.name, update.value.value);
      break;
  }

  for (const callback of listeners) {
    callback(update);
  }
}

const TdClient = {
  get client() {
    return client;
  },
  init() {
    client = new window.tdweb.default({
      onUpdate
    });
  },
  send(query) {
    return client.send(query);
  },
  listen(listener) {
    listeners.add(listener);
  },
  unlisten(listener) {
    listeners.delete(listener);
  },
  getOption(key) {
    return options.get(key);
  }
};

window.TdClient = TdClient;
window.td_options = options;

export default TdClient;