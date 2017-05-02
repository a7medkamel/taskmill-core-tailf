var Promise     = require('bluebird')
  , winston     = require('winston')
  , _           = require('lodash')
  ;
  
class Consumer {
  listen(server) {
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
  }

  on_connection(socket) {
    winston.info('a user connected');
  }

  on_disconnect(socket) {
    winston.info('user disconnected');
  }

  /*
  {
    type  : stdout | stderr,
    time  : unix tyime stamp,
    data  : buffer [data]
  }
  */
  on_msg(msg) {
    if(msg.type == 'stdout') {
      winston.info(msg.data.toString());
    }

    if(msg.type == 'stderr') {
      winston.error(msg.data.toString());
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

if (require.main === module) {
  Consumer
    .make_server()
    .then((server) => {
      (new Consumer()).listen(server);
    });
}