// todo: move serial code from server here
const SerialPort = require('serialport');

const port = new SerialPort('COM5', {
    baudRate: 115200
});
const parser = new SerialPort.parsers.Readline();
port.pipe(parser);
parser.on('data', handleData);
port.on('error', handleError);

function handleError(error) {
    console.log(error);
}

function handleData(data) {
    var dataNr = data.split(',');
    console.log(dataNr.length);
}
