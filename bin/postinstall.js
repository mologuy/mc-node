const fs = require("fs");
const path = require("path");
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

//main
(async ()=>{
    await loadOptionFile();
})();