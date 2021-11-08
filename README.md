## Commands
List devices using command and find serial port of correct device
```
serialport-list
```

Start application by specifying correct serial port, for example serial-port=COM6 and HTTP port, for example http-port=5003
```
npm start --serial-port=COM6 --http-port=5003
```

## Setting up on Windows
Download Python 3 https://www.python.org/download/releases/3.0/
Download VS Build Tools 2017 https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2019
```
npm install --global node-gyp
npm config set msvs_version 2017
```

## Additional reading
* https://itp.nyu.edu/physcomp/labs/labs-serial-communication/lab-serial-communication-with-node-js/
* https://serialport.io/docs/guide-usage
