const WebScoket = require("ws");
const rl = require("readline");

const interface = rl.createInterface({input: process.stdin, output: process.stdout});

let socket = new WebScoket("ws://192.168.0.150:3003/");
/**
 * @returns {Promise<WebScoket>}
 */
function getSocket() {
    return new Promise((resolve, reject)=>{
        if (socket?.readyState === WebScoket.CONNECTING) {
            socket.once("open",()=>{
                resolve(socket);
            });
            socket.once("error", (e)=>{
                reject(e);
            })
            return;
        }
        if (socket?.readyState === WebScoket.OPEN) {
            resolve(socket);
            return;
        }
        socket = new WebScoket("ws://192.168.0.150:3003/");
        socket.once("open", ()=>{
            resolve(socket);
        });
        socket.once("error", (e)=>{
            reject(e);
        });
    });
}

interface.on("line", async (line)=>{
    const sock = await getSocket();
    sock.send(line);
})

interface.on("close", ()=>{
    process.kill(process.pid, "SIGINT");
});