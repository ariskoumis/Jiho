
Streamy.on('note', function(d, s) {
  console.log(d);
  Streamy.broadcast('play', d);
});
