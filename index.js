const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')

const PACKET_DELIMITER = Buffer.from('f6', 'hex');

power = 0;
cadence = 0;
resistence = 0;

port = new SerialPort('/dev/ttyUSB0', { baudRate: 19200 });
parser = port.pipe(new Delimiter({ delimiter: PACKET_DELIMITER }));
parser.on('data', onSerialMessage);

var http = require('http'); // 1 - Import Node.js core module

var server = http.createServer(function (req, res) {   // 2 - creating server

  if (req.url == '/metrics') { //check the URL of the current request
        
    // set response header
    res.writeHead(200, { 'Content-Type': 'application/json' }); 
    
    // set response content
    res.write(JSON.stringify({ cadence: cadence, power: power }));

    res.end();
  }
});

server.listen(5000); //3 - listen for any incoming requests

console.log('Node.js web server at port 5000 is running..')
// f6f54a3f - resistence
// f6f54136 - cadence
// f6f54439 - power
setInterval(function() {
  // request cadence
  port.write(Buffer.from('f6f54136', 'hex'), function(err) {
  if (err) {
      return console.log('Error on write: ', err.message)
    }
  })
  
  setTimeout(function() {
    // request power
    port.write(Buffer.from('f6f54439', 'hex'), function(err) {
      if (err) {
        return console.log('Error on write: ', err.message)
      }
    })
  }, 100)
}, 200)

function onSerialMessage(data) {
  switch(data[1]) {
    case 65:
      cadence = decodePeloton(data, data[2], false);
      return;
    case 68:
      power = decodePeloton(data, data[2], true);
      return;
    case 74:
      resistence = decodePeloton(data, data[2], true);
      return;
  }
}

function decodePeloton(bufferArray, byteLength, isPower) {
  let decimalPlace = 1;
  let precision = 0.0;
  let accumulator = 0;
  let iteratorOffset = 3;

  for (let iteratorTemp = iteratorOffset; iteratorTemp < iteratorOffset + byteLength; iteratorTemp++) {
    let offsetVal = bufferArray[iteratorTemp] - 48;
    if (offsetVal < 0 || offsetVal > 9) {
      console.log("invalid value detected: ", offsetVal);
      return;
    }

    if (!isPower || iteratorTemp != iteratorOffset) {
      accumulator += (offsetVal * decimalPlace);
      decimalPlace *= 10;
    } else {
      precision = decimalPlace * offsetVal / 10.0;
    }
  }

  return accumulator + precision;
}