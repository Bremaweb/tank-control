require('dotenv').config()

if ( process.env.NOUPDATE != '1' ) {
    console.log('Checking for update...')
    const AutoGitUpdate = require('auto-git-update')

    const updater_config = {
        repository: 'https://github.com/Bremaweb/tank-control',
        tempLocation: './tmp',
        ignoreFiles: ['.env'],
        executeOnComplete: 'node client.js',
        exitOnComplete: true
    }

    const updater = new AutoGitUpdate(updater_config);

    updater.autoUpdate();
}

const app = require('./client_modules/app')

// wait and make sure a bunch of stuff is loaded before we try to launch this
// namely the TCP remote control...
console.log("Waiting 30 seconds to start to ensure other services are online...")
setTimeout(() => {
    app.start()
}, 30000);