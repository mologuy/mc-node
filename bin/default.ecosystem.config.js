module.exports = {
  apps : [{
    name   : "mc-server",
    script : "./app.js",
    version: "1.0.0",
    env: {
      MC_TIMEOUT: 5000
    }
  }]
}
