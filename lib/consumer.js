var Promise       = require('bluebird')
  , EventEmitter  = require('events')
  , winston       = require('winston')
  , _             = require('lodash')
  , socket_io     = require('socket.io-client')
  ;

class Consumer extends EventEmitter {
  listen(server) {
    return Promise
            .try(() => {
              let io = socket_io(server);

              io.on('connection', (socket) => {
                this.emit('connection', socket);

                socket.on('disconnect', () => this.emit('disconnect', socket));

                /*{
                  time  : unix tyime stamp,
                  meta  : {
                    type : 'stdout' | 'stderr'
                  }
                  chunk : buffer
                }*/
                socket.on('chunk', (payload) => this.emit('chunk', payload));
                socket.on('end', (payload, fn) => { 
                  this.emit('end', payload);
                  fn(); //ack
                });
              });

              this.io = io;
              this.server = server;
            })
            .then(() => {
              return this;
            });
  }

  connected() {
    if (this.server) {
      return io.sockets.connected;
    }
    
    return {};
  }
  
  port() {
    if (this.server) {
      return this.server.address().port;
    }
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
