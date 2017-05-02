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
                socket.on('end', (payload) => this.emit('end', payload));
              });

              this.io = io;
              this.server = server;
            })
            .then(() => {
              return this;
            });
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