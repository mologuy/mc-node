const readline = require("readline");
const child = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const socket_io  = require("socket.io");

const mcStopTimeoutMS = parseInt(process.env.MC_STOP_TIMEOUT) || 5000;
const serverName = process.env.MC_SERVER_FILENAME || "server.jar";
const mcMaxHeapSize = parseInt(process.env.MAX_HEAP_SIZE) || 1024;
const mcInitialHeapSize = parseInt(process.env.INIT_HEAP_SIZE) || 1024;
const mcVersion = process.env.MC_VERSION || "latest";
const socketPort = parseInt(process.env.SOCKET_PORT) || 3000;

const serverPath = path.join(__dirname,"server-files");
const serverFilePath = path.join(serverPath, serverName);
const consoleRegex_start = "^\\[\\d\\d:\\d\\d:\\d\\d\] \\[Server thread\\/INFO\\]:";
const consoleRegex_username = "\\w{3,16}";

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
 * @type {socket_io.Server}
 */
let io;

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
    mcTimeout = setTimeout(()=>{
        console.log(`Server didn't stop in ${mcStopTimeoutMS/1000} seconds, forcing stop...`);
        mc.kill("SIGKILL");
    },mcStopTimeoutMS);
}

/**
 * @param {Buffer} data 
 */
async function readyCallback(data) {
    if (data.toString().match(`${consoleRegex_start} Done \\(`)) {
        console.log("Ready.");
        if (process.send) {
            process.send("ready");
        }
        mc.stdout.removeListener("data", readyCallback);
    }
}

/**
 * @param {Buffer} data 
 */
 async function consoleCallback(data) {

 }


/**
 * @param {Buffer} data 
 */
async function chatCallback(data) {
    const chatMatch = data.toString().match(`${consoleRegex_start} <(${consoleRegex_username})> ([^\\n]+)\\n$`);
    if (chatMatch) {
        const chatMessage = {username: chatMatch[1], message: chatMatch[2]};
        console.log(chatMessage);
    }
}

/**
 * @param {Buffer} data 
 */
async function playerJoinCallback(data) {
    const joinedMatch = data.toString().match(`${consoleRegex_start} (${consoleRegex_username}) joined the game\\n$`);
    if (joinedMatch) {
        const joinedMessage = {username: joinedMatch[1]};
        console.log(joinedMessage);
    }
}

/**
 * @param {Buffer} data 
 */
async function playerLeaveCallback(data) {
    const leaveMatch = data.toString().match(`${consoleRegex_start} (${consoleRegex_username}) left the game\\n$`);
    if (leaveMatch) {
        const leaveMessage = {username: leaveMatch[1]};
        console.log(leaveMessage);
    }
}

async function downloadServer(){
    return new Promise(async (resolve, reject)=>{
        const versionManifestUrl = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
        /**
         * @type {axios.AxiosResponse}
         */
        let res = await axios({method: "get", url: versionManifestUrl, responseType: "json"});

        let versionToDownload;
        if (mcVersion == "latest") {
            versionToDownload = res.data.latest.release;
        }
        else {
            versionToDownload = mcVersion;
        }

        const downloadVersionManifestUrl = res.data.versions.find((entry) => entry.id == versionToDownload)?.url;
        if (downloadVersionManifestUrl){
            res = await axios({method: "get", url: downloadVersionManifestUrl, responseType: "json"});
        }
        else {
            throw new Error(`Invalid Minecraft Version: ${versionToDownload}`);
        }

        const downloadServerUrl = res.data.downloads.server.url;
        console.log(`Downloading server version ${versionToDownload} from:`, downloadServerUrl);

        const tempfilepath = path.join(serverPath, "download.temp");
        const finalfilepath = serverFilePath;

        const writer = fs.createWriteStream(tempfilepath);
        res = await axios({method:"get", url: downloadServerUrl, responseType: "stream"});
        res.data.pipe(writer);
    
        writer.on("finish", async ()=>{
            await fs.promises.rename(tempfilepath, finalfilepath);
            console.log("Download done.");
            resolve();
        });

        writer.on("error", reject);
    });
}

async function checkForDownload() {
    if (!fs.existsSync(serverPath)) {
        await fs.promises.mkdir(serverPath);
    }
    try {
        await fs.promises.access(serverFilePath, fs.constants.F_OK | fs.constants.W_OK)
        console.log(`${serverName} found`);
        return;
    }
    catch (e) {
        if (e.code == "ENOENT") {
            console.log("Server not found, downloading...");
            await downloadServer();
            return;
        }
        else {
            throw e;
        }
    }
}

async function main() {
    await checkForDownload();

    //o = new socket_io.Server(socketPort);

    mc = child.spawn("java", [`-Xmx${mcMaxHeapSize}M`, `-Xmx${mcInitialHeapSize}M`, "-jar", serverName, "nogui"],{detached: true, cwd: serverPath});
    
    mc.on("exit", mcExitCallback);
    mc.stdout.pipe(process.stdout);

    mc.stdout.on("data", readyCallback);
    mc.stdout.on("data", chatCallback);
    mc.stdout.on("data", playerJoinCallback);
    mc.stdout.on("data", playerLeaveCallback);

    rl_interface = readline.createInterface({input: process.stdin, output: process.stdout});
    rl_interface.on("line", stdinCallback);
    rl_interface.on("SIGINT", ()=>{
        rl_interface.close();
        process.kill(process.pid,"SIGINT");
    });

    process.on("SIGINT", sigintCallback);
}
main();