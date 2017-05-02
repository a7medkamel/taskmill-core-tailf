var Consumer = require('../lib/consumer')
  , Producer = require('../lib/producer')
  ;

Consumer
    .make_server()
    .then((server) => {
      (new Consumer())
        .listen(server)
        .then((c) => {
          c.on('chunk', (payload) => console.log('write', payload))
          c.on('end', (payload) => console.log('end', payload))
        });

      let port      = server.address().port
        , url       = `http://localhost:${port}/#12345`
        , stream_a  = (new Producer(url)).stream({ type : 'a', id : 123 })
        , stream_b  = (new Producer(url)).stream({ type : 'b', id : 123 })
        ;

      let i = 10;

      function next() {
        if (--i <= 0) {
          stream_a.end();
          stream_b.end();

          setTimeout(() => process.exit(), 1000);
          return;
        }

        setTimeout(() => { 
          let stamp = `${i}`;

          stream_a.write(stamp);
          stream_b.write(stamp);

          next();
        }, 1000);
      }
      
      next();
    });