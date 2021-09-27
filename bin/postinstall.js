const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
let options;

const optionspath = path.join(__dirname, "..", "config.json");
const defaultoptionspath = path.join(__dirname, "default.config.json");

async function loadOptionFile() {
    if (fs.existsSync(optionspath)) {
        options = require(optionspath);
        console.log("Loaded config.json");
    }
    else {
        options = require(defaultoptionspath);
        console.log("options.json not found\nLoading defaults...");
        await fs.promises.copyFile(defaultoptionspath, optionspath);
    }
}

/**
 * @param {string} command 
 * @returns {Promise<string>}
 */
function execPromise(command) {
    return new Promise((resolve, reject)=>{
        child_process.exec(command, (err, stdout, stderr)=>{
            if (err) {
                reject(err);
            }
            else {
                resolve(stdout);
            }
        })
    });
}

async function chmodScripts() {
    const shellScriptsDir = path.join(__dirname, "..", "shell_scripts");
    const backupScript = path.join(shellScriptsDir, "backup.sh");
    const updateScript = path.join(shellScriptsDir, "update.sh");
    await execPromise(`chmod ug+x ${backupScript}`);
    await execPromise(`chmod ug+x ${updateScript}`);
}

//main
(async ()=>{
    chmodScripts()
    .catch((e)=>{
        console.log("Couldn't add execute permissions to shell scripts.", e);
    });

    await loadOptionFile();
})();