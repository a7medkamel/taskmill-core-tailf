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
      , room    = url.searchParams.get('room')
      , host    = url.origin
      ;

    this.room = room;
    this.socket = socket_io(host);
  }

  stream(meta) {
    let { socket, room } = this;

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
      if (chunk) {
        socket.emit('chunk', { time, meta : m, room, chunk });
      } else {
        socket.emit('end', { time, meta : m, room }, () => {
          socket.close();
        });
      }

      cb(undefined, chunk);
    };

    function flush (cb) {
      let { room }  = this
        , time      = new Date().getTime()
        ;

      // io.emit('end', { time, meta }, () => {
      // io.on(room, { time, meta }, () => {
      socket.emit('end', { time, meta, room }, () => {
        socket.close();
        cb();
      });
    };

    return through2.obj(transform, flush);
  }
}

module.exports = Producer;
