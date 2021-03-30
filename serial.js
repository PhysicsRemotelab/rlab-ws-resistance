const SerialPort = require('serialport');

SerialPort.list().then(function(ports) {
    ports.forEach(function(port) {
        // console.log("Port: ", port);
    });
});

const port = new SerialPort('COM7', {
    baudRate: 115200,
    lock: false
});

const start = [0x24,0x01,0x4B,0x00,0x4C,0x2a];
const stop = [0x24,0x01,0x53,0x00,0x54,0x2a];
const cooling = [0x24,0x01,0x48,0x00,0x49,0x2a];
const warming = [0x24,0x01,0x4A,0x00,0x4B,0x2a];
const sensors = [
    [0x24,0x01,0x47,0x01,0x31,0x7a,0x2a],
    [0x24,0x01,0x47,0x01,0x32,0x7b,0x2a],
    [0x24,0x01,0x47,0x01,0x33,0x7c,0x2a],
    [0x24,0x01,0x47,0x01,0x34,0x7d,0x2a],
    [0x24,0x01,0x47,0x01,0x35,0x7e,0x2a],
    [0x24,0x01,0x47,0x01,0x36,0x7f,0x2a]
];

const task = async function test() {
    console.log('start');
    port.write(start);
    await new Promise(r => setTimeout(r, 2000));

    const Delimiter = SerialPort.parsers.Delimiter;
    const parser = new Delimiter({ delimiter: [0x2a], includeDelimiter: true });
    port.pipe(parser);
    for (let i=0; i< 500; i++) {
        port.write(sensors[0]);
        await new Promise(r => setTimeout(r, 2000));
        parser.on('data', (dataNew) => {
            dataNew = new Int32Array(dataNew);
            let temp = dataNew[6];
            let res = dataNew[7] * 256 + dataNew[8];
            console.log('T = ' + temp + ' R = ' + res);
            console.log(res);
            if (res[4] == 0) {
                console.log('stop');
                port.write(stop);
                process.exit(1);
            }
        });
    }

    console.log('stop');
    port.write(stop);
    await new Promise(r => setTimeout(r, 2000));

    console.log('exit');
    await new Promise(r => setTimeout(r, 2000));
    process.exit(1);
}

task();
