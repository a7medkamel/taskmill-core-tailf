var Consumer  = require('../lib/consumer')
  , Producer  = require('../lib/producer')
  , ASCIICast = require('../lib/asciicast')
  ;

Consumer
    .make_server()
    .then((server) => {
      let asciicast = new ASCIICast();

      let ascii_stream = asciicast.stream();

      ascii_stream.pipe(process.stdout);

      (new Consumer())
        .listen(server)
        .then((c) => {
          // c.on('chunk', (payload) => console.log('write', payload));
          // c.on('end', (payload) => console.log('end', payload));

          // todo [akamel] there are 2 streams here... we are treating them as one
          c.on('chunk', (payload) => ascii_stream.write(payload));
          c.on('end', (payload) => ascii_stream.end());
        });

      let port      = server.address().port
        , url       = `http://localhost:${port}/#12345`
        , stream_a  = (new Producer(url)).stream({ type : 'a', id : 123 })
        // , stream_b  = (new Producer(url)).stream({ type : 'b', id : 123 })
        ;

      let i = 5;

      function next() {
        if (--i < 0) {
          stream_a.end();
          // stream_b.end();

          setTimeout(() => process.exit(), 1000);
          return;
        }

        setTimeout(() => { 
          let stamp = `${i}`;

          stream_a.write(stamp);
          // stream_b.write(stamp);

          next();
        }, 1000);
      }
      
      next();
    });