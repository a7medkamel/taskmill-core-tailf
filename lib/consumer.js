var Promise       = require('bluebird')
  , EventEmitter  = require('events')
  , winston       = require('winston')
  , _             = require('lodash')
  ;
  
class Consumer extends EventEmitter {
  listen(server) {
    return Promise
            .try(() => {
              let io = require('socket.io')(server);

              io.on('connection', (socket) => {
                this.on_connection(socket);

                socket.on('disconnect', () => {
                  this.on_disconnect(socket);
                });

                socket.on('msg', (msg) => {
                  this.on_msg(msg);
                });
              });

              this.io = io;
              this.server = server;
            });
  }

  on_connection(socket) {
    this.emit('connection', socket);
  }

  on_disconnect(socket) {
    this.emit('disconnect', socket);
  }

  /*
  {
    time  : unix tyime stamp,
    meta  : {
      type : 'stdout' | 'stderr'
    }
    chunk : buffer
  }
  */
  on_msg(msg) {
    this.emit('msg', msg);
    // if(msg.data.type == 'stdout') {
    //   winston.info(msg.data.chunk.toString());
    // }

    // if(msg.data.type == 'stderr') {
    //   winston.error(msg.data.chunk.toString());
    // }    
  }

  static make_server() {
    return Promise
            .try(() => {
              let server = require('http').createServer(() => {});

              return Promise
                      .fromCallback((cb) => {
                        server.listen((err) => cb(err, server));
                      });
            });
  }
}

module.exports = Consumer;

if (require.main === module) {
  Consumer
    .make_server()
    .then((server) => {
      (new Consumer()).listen(server);
    });
}