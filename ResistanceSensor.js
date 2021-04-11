const SerialPort = require('serialport');

class ResistanceSensor {
    init(com) {
        this.port = new SerialPort(com, {
            baudRate: 115200,
            lock: false
        });

        this.parser = new SerialPort.parsers.Delimiter({ delimiter: [0x2a], includeDelimiter: true });
        this.port.pipe(this.parser);

        this.commands = new Map();
        this.commands.set('start', [0x24,0x01,0x4B,0x00,0x4C,0x2a]);
        this.commands.set('stop', [0x24,0x01,0x53,0x00,0x54,0x2a]);
        this.commands.set('warming', [0x24,0x01,0x48,0x00,0x49,0x2a]);
        this.commands.set('cooling', [0x24,0x01,0x4A,0x00,0x4B,0x2a]);
        this.commands.set('sensor1', [0x24,0x01,0x47,0x01,0x31,0x7a,0x2a]);
        this.commands.set('sensor2', [0x24,0x01,0x47,0x01,0x32,0x7b,0x2a]);
        this.commands.set('sensor3', [0x24,0x01,0x47,0x01,0x33,0x7c,0x2a]);
        this.commands.set('sensor4', [0x24,0x01,0x47,0x01,0x34,0x7d,0x2a]);
        this.commands.set('sensor5', [0x24,0x01,0x47,0x01,0x35,0x7e,0x2a]);
        this.commands.set('sensor6', [0x24,0x01,0x47,0x01,0x36,0x7f,0x2a]);
    }

    async listPorts() {
        let correctPort = null;
        await SerialPort.list().then(function(ports) {
            ports.forEach(function(port) {
                console.log("Port: ", port);
                if (port['serialNumber'] === 'A63WQY17') {
                    correctPort = port['path'];
                }
            });
        });
        return correctPort;
    }

    async write(command) {
        await this.wait(1000);
        this.port.write(this.commands.get(command));
    }

    async close() {
        if (this.port.isOpen) {
            this.port.close();
            await this.wait(1000);
            console.log('Port closed');
        }
    }

    async open() {
        if (!this.port.isOpen) {
            this.port.open();
            this.parser = new SerialPort.parsers.Delimiter({ delimiter: [0x2a], includeDelimiter: true });
            this.port.pipe(this.parser);
            await this.wait(1000);
            console.log('Port opened');
        }
    }

    read(size) {
        const buffer = this.parser.read(size);
        if (!buffer) {
            return;
        }
        console.log(buffer);
        let data = new Int32Array(buffer);
        console.log(data);
        this.isHeaterOn = data[0] === 1;
        this.isFanOn = data[0] === 2;

        if (data.length < 5) {
            return;
        }

        if (data[0] === 0) {
            console.log('last measurement');
            return [0, 0];
        }

        if (data[2] < 20) {
            return;
        }

        let temperature = data[2];
        let resistance = data[3] * 256 + data[4];
        return [temperature, resistance];
    }

    isFanActive() {
        return this.isFanOn;
    }

    isHeaterActive() {
        return this.isHeaterOn;
    }

    wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = ResistanceSensor;
