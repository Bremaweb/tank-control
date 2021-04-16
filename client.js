const { exec } = require("child_process");
require('dotenv').config()

if ( process.env.NOUPDATE != '1' ) {
    exec('git pull;npm install', (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

const app = require('./client_modules/app')

// wait and make sure a bunch of stuff is loaded before we try to launch this
// namely the TCP remote control...
console.log("Waiting 30 seconds to start to ensure other services are online...")
setTimeout(() => {
    app.start()
}, 30000);
