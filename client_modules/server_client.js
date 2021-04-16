const net = require('net')
const localtunnel = require('localtunnel')


const client = () => {
    let c = {
        socket : null,
        tank : null,
        state : {
            connected : false,
            stage : null
        },
        cameras : [],
    }

    c.connect = async () => {
        try {

            console.log("Opening camera tunnel(s)...")
            await c.openTunnels()

            console.log("Connecting to Web Controller " + process.env.SERVER_HOST + ":" + process.env.SERVER_PORT);
            c.socket.connect(process.env.SERVER_PORT, process.env.SERVER_HOST, () => {
                console.log('Connected to Web Controller');
                c.state.connected = true;
                c.state.stage = 'init'
                c.write('hi')
            });
        } catch (e) {
            console.log("Error connecting to Web Controller: " + e);
            c.retry();
        }
    }

    c.retry = () => {
        console.log("Will retry");
        setTimeout(() => { console.log('Retry'); c.connect() }, 10000);
    }

    c.write = async (data) => {
        if ( c.state.connected ){
            console.log("To Web Controller: " + data);
            c.socket.write(data);
        } else {
            console.log("Not connected");
        }
    }

    c.onData = async (data) => {
        data = data.toString();
        console.log("From Web Controller: " + data)

        if ( c.state.stage == 'init' ){
            if ( data == 'welcome' ){
                c.state.stage = 'info';
                let tInfo = {
                    'name' : process.env.TANK_NAME || 'Tank ' + (Math.random() * 1000),
                    'password' : process.env.TANK_PASSWORD,
                    'cameras' : c.cameras
                }
                c.write(JSON.stringify(tInfo));
            }
            return
        }

        if ( c.state.stage == 'info' ){
            if ( data == 'OK' ){
                c.state.stage = 'connected';
                c.tank.beep(2,250);
            }
            return
        }

        if ( c.state.stage == 'connected' ){
            data = JSON.parse(data);
            if ( data.type == "cmd" ){
                c.parseCommand(data);
                return
            }

            if ( data.type == "raw" ){
                c.tank.write(data.command);
                return
            }

            if ( data.type == 'ping' ){
                c.write('pong');
            }
        }
    }

    c.onClose = () => {
        console.log("Web Controller Connection closed!");
        c.state.connected = false;
        c.state.stage = null;
        c.retry()
    }

    c.parseCommand = (data) => {
        let cmd = data.command;
        let duration = typeof(data.duration) != 'undefined' && data.duration > 0 ? data.duration : null;
        switch ( cmd ){
            case "stop" :
                c.tank.commandString("0", 1);   // stop motion and all that
                c.tank.commandString("8", 5);   // stop camera
                break;
            case "beep" :
                c.tank.commandString("1", 3);
                break;
            case "f": // forward
                c.tank.commandString("1", 1, duration);
                break;
            case "b": // backward
                c.tank.commandString("2", 1, duration);
                break;
            case "l": // left
                c.tank.commandString("1", 2, duration);
                break;
            case "r": // right
                c.tank.commandString("2", 2, duration);
                break;
            case "tl": // track left
                c.tank.commandString("3", 1, duration);
                break;
            case "tr": // track right
                c.tank.commandString("4", 1, duration);
                break;
            case "cu": // camera up
                c.tank.commandString("3", 5);
                if ( duration ) {
                    setTimeout(() => { c.tank.commandString("8", 5) }, duration);
                }
                break;
            case "cd": // camera down
                c.tank.commandString("4", 5);
                if ( duration ){
                    setTimeout(() => { c.tank.commandString("8", 5) }, duration);
                }
                break;
            case "cl": // camera left
                c.tank.commandString("6", 5);
                if ( duration ) {
                    setTimeout(() => { c.tank.commandString("8", 5) }, duration);
                }
                break;
            case "cr": // camera right
                c.tank.commandString("7", 5);
                if ( duration ){
                    setTimeout(() => { c.tank.commandString("8", 5) }, duration);
                }
                break;
            case "a+": // speed up
                c.tank.commandString("1", 4);
                break;
            case "a-": // slow down
                c.tank.commandString("2", 4);
                break;
        }
    }

    c.openTunnels = async () => {
        let ports = process.env.CAMERA_PORTS.split(",");
        if ( ports ){
            for ( let i in ports ){
                try {
                    console.log("Opening tunnel to port: " + ports[i]);
                    const tunnel = await localtunnel({ port : ports[i], host : 'bremaweb.xyz' });
                    console.log("Tunnel " + ports[i] + ": " + tunnel.url);

                    let cam = {
                        ptz : i == 0,
                        name : 'Camera ' + ( parseInt(i) + 1 ) + ' (Tunnel)',
                        url : tunnel.url
                    }
                    c.cameras.push(cam);
                } catch ( e ){
                    console.log("Tunnel failed: " + e);
                }

                let localIp = c.getIp();
                if ( localIp != '0.0.0.0' && localIp != '127.0.0.1' ){
                    c.cameras.push({
                        ptz : i == 0,
                        name : 'Camera ' + ( parseInt(i) + 1 ) + ' (LAN)',
                        url : 'http://' + localIp + ":" + ports[i]
                    });
                }
            }
        }
    }

    c.getIp = () => {
        var interfaces = require('os').networkInterfaces();
        for (var devName in interfaces) {
            var iface = interfaces[devName];

            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                    return alias.address;
            }
        }
        return '0.0.0.0';
    }

    c.socket = new net.Socket();
    c.socket.on('data', c.onData);
    c.socket.on('close', c.onClose);

    c.tank = require('./tank_client');
    c.connect()

    return c;
}

module.exports = client();