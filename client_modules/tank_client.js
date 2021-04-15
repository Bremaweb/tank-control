const net = require('net')

tank_client = function() {
    tc = {
        socket : null,
        connected : false,

        connect(){
            try {
                this.socket.connect(process.env.TANK_PORT, process.env.TANK_HOST, () => {
                    this.connected = true;
                    console.log("Connected to tank TCP Controller");
                    this.beep(1);
                });
            } catch ( e ) {
                console.log('Error connecting to tank: ' + e);
                this.retry();
            }
        },

        retry(){
            console.log("Will retry");
            setTimeout(() => { console.log("Retry"); this.connect() }, 10000);
        },

        write(data){
            if ( this.connected ){
                console.log("To Tank: " + data);
                this.socket.write(data);
            } else {
                console.log('Not connected');
            }
        },

        onData(data){
            console.log("From Tank: " + data);
        },

        onClose(){
            console.log("Disconnected from Tank")
            this.retry();
            this.connected = false;
        },

        async beep(count = 1, delay = 0){
            for ( let i = 0; i < count; i++ ){
                this.write("$00001#");
                await this.sleep(delay);
            }
        },

        async commandString(str, pos, duration = null){
            pos = pos - 1;
            let cmd = ['0','0','0','0','0','0','0','0','0'];
            cmd[pos] = str;

            this.write("$" + cmd.join(',') + "#");
            if ( duration !== null ){
                // send the stop command
                setTimeout(() => { this.commandString('0',1) }, duration);
            }
        },

        async rawCommand(cmd){
            this.write(cmd);
        },

        sleep(ms) {
            return new Promise((resolve) => {
                setTimeout(resolve, ms);
            });
        }
    }

    tc.socket = new net.Socket();
    tc.socket.on("data", tc.onData);
    tc.socket.on("close", tc.onClose);
    tc.connect();

    return tc;
}

module.exports = tank_client();