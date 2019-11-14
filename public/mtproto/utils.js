function intRand(min, max) {
  return min + Math.round(Math.random() * (max - min));
}

function sleep(t) {
  return new Promise((resolve => {
    setTimeout(resolve, t);
  }));
}

class storage {
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

  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
}

const workerTask = (() => {
  let worker;

  const workerPromise = new Promise(resolve => {
    new Worker('./mtproto/worker.js').addEventListener('message', (event) => {
      if (event.data === 'ready') {
        worker = event.target;
        resolve(worker);
      } else {
        const deferred = tasksCallbacks[event.data.taskId];
        delete tasksCallbacks[event.data.taskId];
        if (event.data.error) {
          deferred.reject(event.data.error);
        } else {
          deferred.resolve(event.data.result);
        }
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
    const taskId = newTaskId();
    const deferred = getDeferred();
    tasksCallbacks[taskId] = deferred;
    worker.postMessage({taskId, task, params});
    return deferred.promise;
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
  intRand,
  sleep,
  storage,
  workerTask,
  getDeferred
};
