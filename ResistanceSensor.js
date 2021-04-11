const SerialPort = require('serialport');

class ResistanceSensor {
    init(com) {
        this.port = new SerialPort(com, {
            baudRate: 115200,
            lock: false
        }, false);

        const Delimiter = SerialPort.parsers.Delimiter;
        this.parser = new Delimiter({ delimiter: [0x2a], includeDelimiter: true });
        this.port.pipe(this.parser);
        this.pause();

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
        // hack to prevent writing too fast and overwriting previous command
        await this.wait(1000);
        this.port.write(this.commands.get(command));
    }

    resume() {
        if (this.port.isPaused()) {
            this.port.resume();
            console.log('Port resumed');
        }
    }

    pause() {
        if (!this.port.isPaused()) {
            this.port.pause();
            console.log('Port paused');
        }
    }

    close() {
        if (this.port.isOpen) {
            this.port.close();
            console.log('Port closed');
        }
    }

    open() {
        if (!this.port.isOpen) {
            this.port.open();
            console.log('Port opened');
        }
    }

    read(size) {
        const buffer = this.parser.read(size);
        if (!buffer) {
            return;
        }

        let data = new Int32Array(buffer);
        this.isFanTurnedOnVar = data[1];
        this.isHeaterOnVar = data[0] === 1;

        if (data.length < 8) {
            return;
        }

        if (data[0] === 0) {
            console.log('last measurement');
            return [0, 0];
        }
        let temperature = data[2];
        let resistance = data[3] * 256 + data[4];
        return [temperature, resistance];
    }

    isFanTurnedOn() {
        return this.isFanTurnedOnVar;
    }

    isHeaterOn() {
        return this.isHeaterOnVar;
    }

    wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = ResistanceSensor;
