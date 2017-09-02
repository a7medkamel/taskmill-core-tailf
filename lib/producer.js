'use strict';

var Promise     = require('bluebird')
  , winston     = require('winston')
  , _           = require('lodash')
  , { URL }     = require('universal-url')
  , through2    = require('through2')
  , socket_io   = require('socket.io-client')
  ;

class Producer {
  constructor(tailf) {
    let url     = new URL(tailf)
      , room    = url.pathname.substring(1)
      , host    = url.origin
      ;

    // this.room = room;
    this.socket = socket_io(host);

    this.roomAsync = Promise
                      .try(() => {
                        if (room) {
                          return room;
                        }

                        return Promise
                                .fromCallback((cb) => {
                                  this.socket.on('connect', (socket) => {
                                    cb(undefined, socket.id);
                                  });
                                });
                      });
  }

  stream(meta) {
    let { socket, roomAsync } = this;

    function transform (chunk, enc, cb) {
      let time  = new Date().getTime()
        , m     = meta
        ;

      if (_.isObject(chunk)) {
        if (chunk.meta) {
          m = _.extend({}, meta, chunk.meta);
        }

        chunk = chunk.chunk;
      }

      // io.on(room, { time, meta, chunk });
      // io.emit('chunk', { time, meta, chunk });
      roomAsync
        .then((room) => {
          socket.emit('chunk', { time, meta : m, room, chunk });
        });

      cb(undefined, chunk);
    };

    function flush () {
      let time = new Date().getTime();
      // io.emit('end', { time, meta }, () => {
      // io.on(room, { time, meta }, () => {
      roomAsync
        .then((room) => {
          socket.emit('end', { time, meta, room }, () => {
            socket.close();
          });
        });
    };

    return through2.obj(transform, flush);
  }
}

module.exports = Producer;
