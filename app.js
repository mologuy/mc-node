const readline = require("readline");
const child = require("child_process");

const mcStopTimeoutMS = process.env.MC_STOP_TIMEOUT || 5000;
const serverName = process.env.MC_SERVER_FILENAME || "server.jar";
const mcMaxHeapSize = process.env.MAX_HEAP_SIZE || 1024;
const mcInitialHeapSize = process.env.INIT_HEAP_SIZE || 1024;

/**
 * @type {readline.Interface}
 */
let rl_interface;
/**
 * @type {child.ChildProcessWithoutNullStreams}
 */
let mc;
/**
 * @type {NodeJS.Timeout}
 */
let mcTimeout;

/**
 * @param {string} line 
 */
async function stdinCallback(line) {
    mc.stdin.write(`${line}\n`);
}

/**
 * @param {number} code 
 */
async function mcExitCallback(code) {
    console.log("Server exited with code:", code);
    if (mcTimeout) {
        clearTimeout(mcTimeout);
    }
    process.exit(code);
}

async function sigintCallback() {
    rl_interface.close();
    mc.stdin.write("stop\n");
    process.send("ready");
    mcTimeout = setTimeout(()=>{
        console.log(`Server didn't stop in ${mcStopTimeoutMS/1000} seconds, forcing stop...`);
        mc.kill("SIGKILL");
    },mcStopTimeoutMS);
}

/**
 * @param {Buffer} data 
 */
async function readyCallback(data) {
    if (data.toString().match(/^\[\d\d:\d\d:\d\d\] \[Server thread\/INFO\]: Done \(/)) {
        console.log("Ready.");
        process.send("ready");
        mc.stdout.removeListener("data", readyCallback);
    }
}

async function main() {
    rl_interface = readline.createInterface({input: process.stdin, output: process.stdout});
    rl_interface.on("line", stdinCallback);

    mc = child.spawn("java", [`-Xmx${mcMaxHeapSize}M`, `-Xmx${mcInitialHeapSize}M`, "-jar", serverName, "nogui"],{detached: true, cwd: "./server-files"});
    mc.stdout.pipe(process.stdout);
    mc.on("exit", mcExitCallback);
    mc.stdout.on("data", readyCallback);

    process.on("SIGINT", sigintCallback);
}
main();