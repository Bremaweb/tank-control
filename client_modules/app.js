const net = require('net');

module.exports = {
    client : null,

    start(){
        this.client = require('./server_client');
    },
}
