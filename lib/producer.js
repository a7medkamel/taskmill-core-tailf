var Promise     = require('bluebird')
  , winston     = require('winston')
  , _           = require('lodash')
  , through2    = require('through2')
  ;

class Producer {
  constructor(url) {
    this.io = require('socket.io-client')(url);
  }

  stream(meta) {
    let trans = (chunk, enc, cb) => {
      let time = new Date().getTime();

      this.io.emit('msg', { time, meta, chunk });

      this.push(chunk);

      callback();
    };

    let flush = () => {
      let time = new Date().getTime();

      this.io.emit('end', { time, meta });
    };

    return through2(trans, flush);
  }
}

module.exports = Producer;

if (require.main === module) {
  let url = 'http://localhost:53630';

  let o = (new Producer(url)).stream({ type : 'stdout' })

  setInterval(() => { o.write(new Date().getTime().toString()) }, 1000);
}