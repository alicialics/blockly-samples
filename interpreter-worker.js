function loadMicropython_() {
  var INTERPRETER_BASE_PATH = "./public";
  return new Promise(function (resolve) {
    import(INTERPRETER_BASE_PATH + "/micropython.mjs").then(function (module) {
      module.loadMicroPython({
        url: INTERPRETER_BASE_PATH + "/micropython.wasm"
      }).then(function (interpreter) {
        resolve(interpreter);
      });
    });
  });
}
var micropythonPromise = loadMicropython_();
globalThis.onmessage = function (event) {
  globalThis["interpreter$ffi"] = function () {
    return event.data.ffi;
  };
  event.data.ffi.forEach(function (name) {
    globalThis["interpreter$" + name] = function () {
      var _arguments = arguments;
      return new Promise(function (resolve) {
        var channel = new MessageChannel();
        channel.port1.onmessage = function (event) {
          resolve(event.data.result);
        }
        var argsPromises = new Array(_arguments.length);
        for (var _key = 0; _key < _arguments.length; _key++) {
          argsPromises[_key] = _arguments[_key];
        }
        Promise.all(argsPromises).then(function (args) {
          globalThis.postMessage({
            name: name,
            args: args
          }, [channel.port2]);
        });
      });
    };
  });
  var pythonCode = [
    'import js',
    'for name in list(getattr(js, "interpreter$ffi")()):',
    '  globals()[name] = getattr(js, "interpreter$" + name)',
    event.data.code
  ];
  micropythonPromise.then(function (interpreter) {
    Promise.resolve(interpreter.runPythonAsync(pythonCode.join('\n'))).then(function () {
      globalThis.postMessage({
        name: "interpreter$done_"
      });
    });
  });
};