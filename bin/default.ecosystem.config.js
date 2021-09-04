module.exports = {
  apps : [{
    name   : "mc-server",
    script : "./app.js",
    version: "1.0.0",
    treekill: false,
    wait_ready: true,
    listen_timeout: 30000,
    kill_timeout: 6000,
    env: {
      "STOP_TIMEOUT": 5000,
      "MAX_HEAP_SIZE":  3000,
    }
  }]
}
