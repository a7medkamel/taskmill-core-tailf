var Promise     = require('bluebird')
  , winston     = require('winston')
  , _           = require('lodash')
  , through2    = require('through2')
  , socket_io   = require('socket.io-client')
  ;

class Producer {
  constructor(url) {
    this.io = socket_io(url);
  }

  stream(meta) {
    let { io } = this;

    function transform (chunk, enc, cb) {
      let time = new Date().getTime();

      io.emit('chunk', { time, meta, chunk });

      this.push(chunk);

      cb();
    };

    function flush () {
      let time = new Date().getTime();

      io.emit('end', { time, meta }, () => {
        io.close();
      });
    };

    return through2(transform, flush);
  }
}

module.exports = Producer;
