var Promise     = require('bluebird')
  , winston     = require('winston')
  , _           = require('lodash')
  , spy         = require('through2-spy')
  ;

class Producer {
  constructor(url) {
    this.io = require('socket.io-client')(url);
  }

  stream() {
    return spy((data = {}) => {
      this.io.emit('msg', {
          time : new Date().getTime()
        , data
      });
    })
  }
}

module.exports = Producer;

if (require.main === module) {
  let url = 'http://localhost:53630';

  let o = (new Producer(url)).stream('stdout')

  setInterval(() => { o.write({ type : 'stdout', chunk : new Date().getTime().toString()) }}, 1000);
  setInterval(() => { o.write({ type : 'stderr', chunk : new Date().getTime().toString()) }}, 3000);
}