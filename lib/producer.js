var Promise     = require('bluebird')
  , winston     = require('winston')
  , _           = require('lodash')
  , spy         = require('through2-spy')
  ;

class Producer {
  constructor(url) {
    this.io = require('socket.io-client')(url);
  }

  stream(type) {
    return spy((chunk) => {
      this.io.emit('msg', {
          type
        , time : new Date().getTime()
        , data : chunk
      });
    })
  }
}

module.exports = Producer;

if (require.main === module) {
  let url = 'http://localhost:53630';

  let o = (new Producer(url)).stream('stdout')
  let e = (new Producer(url)).stream('stderr')

  setInterval(() => { o.write(new Date().getTime().toString()) }, 1000);
  setInterval(() => { e.write(new Date().getTime().toString()) }, 2000);
}