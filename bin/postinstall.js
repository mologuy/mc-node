const fs = require("fs");
const axios = require("axios");
const path = require("path");
let options;

const serverpath = path.join(__dirname, "..", "server-files");

async function downloadServer(){
    const versionManifestUrl = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
    let res = await axios({method: "get", url: versionManifestUrl, responseType: "json"});
    const latestVersion = res.data.latest.release;
    const latestManifestUrl = res.data.versions.find((entry) => entry.id == latestVersion).url;
    res = await axios({method: "get", url: latestManifestUrl});
    const latestServerUrl = res.data.downloads.server.url;
    console.log("Downloading from:", latestServerUrl);

    const writer = fs.createWriteStream(path.join(serverpath, "temp.file"));
    res = await axios({method:"get", url: latestServerUrl, responseType: "stream"});
    res.data.pipe(writer);

    writer.on("finish", async ()=>{
        await fs.promises.rename(path.join(serverpath, "temp.file"), path.join(serverpath, "server.jar"));
        console.log("Done.")
    });
}

async function loadOptionFile() {
    const optionspath = path.join(__dirname, "..", "options.json");
    if (fs.existsSync(optionspath)) {
        options = require("../options.json");
        console.log("Loaded options.json");
    }
    else {
        options = require("./default.json");
        console.log("options.json not found\nLoading defaults...");
        await fs.promises.writeFile(optionspath, JSON.stringify(options,null,4));
    }
}

//main
(async ()=>{
    await loadOptionFile();
    if (!fs.existsSync(serverpath)) {
        await fs.promises.mkdir(serverpath);
    }
    try {
        await fs.promises.access(path.join(serverpath, "server.jar"), fs.constants.F_OK | fs.constants.W_OK)
        console.log(`server.jar found`);
    }
    catch (e) {
        if (e.code == "ENOENT") {
            console.log("Server not found, downloading...");
            await downloadServer();
        }
        else {
            throw e;
        }
    }
})();