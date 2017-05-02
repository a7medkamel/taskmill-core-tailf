var Promise     = require('bluebird')
  , winston     = require('winston')
  , _           = require('lodash')
  , through2    = require('through2')
  ;
  
// {
//   "version": 1,
//   "width": 80,
//   "height": 24,
//   "duration": 1.515658,
//   "command": "/bin/zsh",
//   "title": "",
//   "env": {
//     "TERM": "xterm-256color",
//     "SHELL": "/bin/zsh"
//   },
//   "stdout": [
//     [
//       0.248848,
//       "\u001b[1;31mHello \u001b[32mWorld!\u001b[0m\n"
//     ],
//     [
//       1.001376,
//       "I am \rThis is on the next line."
//     ]
//   ]
// }

class ASCIICast {
  constructor(options = {}) {
    this.options = _.defaults({ version : 1, stdout : ['FOOBAR'] }, options, {
      'width': 80,
      'height': 24,
      'command': '/bin/bash',
      'title': '',
      'env': {
        'TERM': 'xterm-256color',
        'SHELL': '/bin/bash'
      },
      'duration' : '[DURATION]'
    });
  }

  stream() {
    if (!this.__s) {
      let tmpl  = JSON.stringify(this.options)
        , split = tmpl.split(`"FOOBAR"`)
        ;

      let open  = `${split[0]}\n`
        , sep   = '\n,\n'
        , close = `\n${split[1]}\n`
        ;

      let time_a = undefined;
      let time_b = undefined;
      function transform (chunk, enc, cb) {
        let time = chunk.time;

        time_a = time_a || time;
        time_b = time;

        let delta = time_b - time_a
          , item  = [ delta, chunk.chunk.toString() ]
          ;

        if (!delta) {
          this.push(open);
        } else {
          this.push(sep);
        }

        this.push(JSON.stringify(item));

        cb();
      };

      function flush (cb) {
        this.push(close.replace(`"[DURATION]"`, (time_b - time_a) / 1000 ));
        cb();
      };

      this.__s = through2.obj(transform, flush);
    }

    return this.__s;
  }

  // write(chunk) {
  //   this.stream.write(chunk);
  // }

  // end() {

  // }
}

module.exports = ASCIICast;