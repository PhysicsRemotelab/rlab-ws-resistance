const http = require('http');
const ws = require('ws');
const Sensor = require("./Sensor.js");

const httpPort = process.env.npm_config_http_port;
const serialport = process.env.npm_config_serial_port;

if (!httpPort || !serialport) {
    console.log('Missing required parameters');
    return;
}

let sensor = new Sensor();
sensor.init(serialport);

let server = http.createServer((req, res) => {
    res.writeHead(200);
});
server.listen(httpPort, () => console.log('Started server on', httpPort));
const wss = new ws.Server({server, path: '/resistance'});

wss.on('connection', handleConnection);
let connections = new Array;

function handleConnection(client) {
    console.log('New connection');
    connections.push(client);

    client.on('message', (message) => {
        console.log(message);
        handleCommand(message);
    });
    client.on('error', error => {
        console.log(error);
    });
    client.on('close', () => {
        console.log('Connection closed');
        let position = connections.indexOf(client);
        connections.splice(position, 1);
        if (connections.length === 0) {
            isRunning = false;
            sensor.write('stop');
        }
    });
}

function handleCommand(message) {
    try {
        message = JSON.parse(message);
    } catch (e) {
        console.log('Not JSON');
        return;
    }

    let command = message.command;
    if (command === 'stop') {
        handleStop(command);
    }
    if (command.startsWith('sensor')) {
        handleSensor(command);
    }
}

async function handleStop(command) {
    isRunning = false;
    await sensor.write(command);
    await sensor.close();
    return;
}

let isRunning = true;
async function handleSensor(command) {
    if (command.startsWith('sensor')) {
        await sensor.open();
        await sensor.write('start');
        isRunning = true;
        let previousResponse = undefined;
        while (isRunning) {
            await sensor.write(command);
            let response = sensor.read(11);
            if(JSON.stringify(response) === JSON.stringify(previousResponse)) {
                continue;
            }
            if (response) {
                previousResponse = response;
                broadCastData(response);
                if (JSON.stringify(response) === JSON.stringify([0, 0])) {
                    await sensor.close();
                    isRunning = false;
                }
            }
        }
    }
}

function broadCastData(data) {
    if (connections.length > 0) {
        data = JSON.stringify(data);
        console.log(data);
        for (connection in connections) {
            connections[connection].send(data);
        }
    }
}
