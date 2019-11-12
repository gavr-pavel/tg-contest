function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function intRand(min, max) {
  return min + Math.round(Math.random() * (max - min));
}

function sleep(t) {
  return new Promise((resolve => {
    setTimeout(resolve, t);
  }));
}

class Storage {
  static get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  static set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }
}

const workerTask = (() => {
  let worker;

  const workerPromise = new Promise(resolve => {
    new Worker('./worker.js').addEventListener('message', (event) => {
      if (event.data === 'ready') {
        worker = event.target;
        resolve(worker);
      } else {
        const callback = tasksCallbacks[event.data.taskId];
        delete tasksCallbacks[event.data.taskId];
        callback(event.data.result);
      }
    });
  });

  const newTaskId = (() => {
    let i = 0;
    return () => ++i;
  })();

  const tasksCallbacks = {};

  return async (task, params) => {
    if (!worker) {
      await workerPromise;
    }
    return new Promise(resolve => {
      const taskId = newTaskId();
      tasksCallbacks[taskId] = resolve;
      worker.postMessage({taskId, task, params});
    });
  }
})();

function getDeferred() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

export {
  chunkArray,
  intRand,
  sleep,
  Storage,
  workerTask,
  getDeferred
};
