const http = require('http');
const ws = require('ws');
const SerialPort = require('serialport');

SerialPort.list().then(function(ports) {
    ports.forEach(function(port) {
        console.log("Port: ", port);
    });
});

const port = new SerialPort('COM7', {
    baudRate: 115200,
    lock: false
});

var commands = new Map();
commands.set('start', [0x24,0x01,0x4B,0x00,0x4C,0x2a]);
commands.set('stop', [0x24,0x01,0x53,0x00,0x54,0x2a]);
commands.set('warming', [0x24,0x01,0x48,0x00,0x49,0x2a]);
commands.set('cooling', [0x24,0x01,0x4A,0x00,0x4B,0x2a]);
commands.set('sensor1', [0x24,0x01,0x47,0x01,0x31,0x7a,0x2a]);
commands.set('sensor2', [0x24,0x01,0x47,0x01,0x32,0x7b,0x2a]);
commands.set('sensor3', [0x24,0x01,0x47,0x01,0x33,0x7c,0x2a]);
commands.set('sensor4', [0x24,0x01,0x47,0x01,0x34,0x7d,0x2a]);
commands.set('sensor5', [0x24,0x01,0x47,0x01,0x35,0x7e,0x2a]);
commands.set('sensor6', [0x24,0x01,0x47,0x01,0x36,0x7f,0x2a]);

const Delimiter = SerialPort.parsers.Delimiter;
const parser = new Delimiter({ delimiter: [0x2a], includeDelimiter: true });
port.pipe(parser);

let finished = false;
const read = async function func(message) {
    port.resume();
    finished = false;
    port.write(commands.get('stop'));
    await new Promise(r => setTimeout(r, 2000));
    port.write(commands.get('start'));
    let prevBuffer;
    for (let i = 0; i < 500; i++) {
        await new Promise(r => setTimeout(r, 2000));
        if (finished) {
            port.write(commands.get('stop'));
            console.log('finished');
            broadCastData([0, 0]);
            break;
        }
        port.write(commands.get(message));
        parser.on('data', (newBuffer) => {
            if (newBuffer !== prevBuffer) {
                finished = handleBuffer(newBuffer);
                prevBuffer = newBuffer;
            }
        });
    }
    console.log('finished');
    port.write(commands.get('stop'));
    broadCastData([0, 0]);
}

let server = http.createServer((req, res) => {
    res.writeHead(200);
});
server.listen(5003, () => console.log('Http running.'));
const wss = new ws.Server({server, path: '/resistance'});
wss.on('connection', handleConnection);
let connections = new Array;

function handleConnection(client) {
    console.log('New connection');
    connections.push(client);

    client.on('message', (message) => {
        console.log('client');
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
            finished = true;
            port.write(commands.get('stop'));
            port.pause();
        }
    });
}

function handleBuffer(buffer) {
    let toggleFinished = false;
    if (buffer !== undefined) {
        let data = new Int32Array(buffer);
        if (data.length < 8) {
            return toggleFinished;
        }
        if (data[4] == 0) {
            console.log('data[4] == 0');
            toggleFinished = true;
            return toggleFinished;
        }
        let temperature = data[6];
        let resistance = data[7] * 256 + data[8];
        let message = [temperature, resistance];
        broadCastData(message);
    }
    return toggleFinished;
}

function handleCommand(message) {
    message = JSON.parse(message);
    let command = message.command;
    if (!commands.has(command)) {
        console.log('Invalid command');
        return;
    }
    if (command.startsWith('sensor')) {
        read(command);
        return;
    }
    if (command == 'stop') {
        port.write(commands.get(command));
        finished = true;
        return;
    }
    port.write(commands.get(command));
}

function broadCastData(data) {
    console.log(data);
    if (connections.length > 0) {
        data = JSON.stringify(data)
        for (connection in connections) {
            connections[connection].send(data);
        }
    }
}
