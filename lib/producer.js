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

  stream(options) {
    let { socket, room }  = this
      , { meta, spec }    = options
      ;

    function transform (chunk, enc, cb) {
      let time      = new Date().getTime()
        , { type }  = chunk
        , m         = meta
        , s         = spec
        ;

      if (_.isObject(chunk)) {
        if (chunk.meta) {
          m = _.extend({}, meta, chunk.meta);
        }

        if (chunk.spec) {
          s = _.extend({}, spec, chunk.spec);
        }

        chunk = chunk.chunk;
      }

      // io.on(room, { time, meta, chunk });
      // io.emit('chunk', { time, meta, chunk });
      if (chunk) {
        socket.emit('chunk', { time, type, meta : m, spec : s, room, chunk });
      } else {
        socket.emit('end', { time, type, meta : m, spec : s, room }, () => {
          socket.close();
        });
      }

      cb(undefined, chunk);
    };

    function flush (cb) {
      let time = new Date().getTime();

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
