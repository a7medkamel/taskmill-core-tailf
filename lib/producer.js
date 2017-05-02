var Promise     = require('bluebird')
  , winston     = require('winston')
  , _           = require('lodash')
  , spy         = require('through2-spy')
  ;

class Producer {
  constructor(url) {
    this.io = require('socket.io-client')(url);
  }

  stream(meta) {
    return spy((chunk) => {
      let time = new Date().getTime();

      this.io.emit('msg', { time, meta, chunk });

      if (!chunk) {
        this.io.emit('end', { time, meta });
      }
    })
  }
}

module.exports = Producer;

if (require.main === module) {
  let url = 'http://localhost:53630';

  let o = (new Producer(url)).stream({ type : 'stdout' })

  setInterval(() => { o.write(new Date().getTime().toString()) }, 1000);
}