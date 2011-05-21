var compress = require('compress');

function _inflater(stream) {
     this._stream = stream;
      var self = this;
       var gunzip = new compress.Gunzip;
        gunzip.init();

         this._stream.on('data', function(d) {
               var _d = gunzip.inflate(d.toString('binary'), 'binary');
                 self.emit('data', _d);
                  })
          .on('end', function() {
                self.emit('end');
                 })
           .on('error', function() {
                 var args = Array.prototype.splice.call(arguments, 0);
                   args.unshift('error');
                     self.emit.apply(self, args);
                      });
}

_inflater.prototype = new process.EventEmitter();


function _deflater(stream) {
     this._stream = stream;
      var self = this;
       var gzip = new compress.Gzip;
        gzip.init();

         this._stream.on('data', function(d) {
               var _d = gzip.deflate(d.toString('binary'), 'binary');
                 self.emit('data', _d);
                  })
          .on('end', function() {
                self.emit('end');
                 })
           .on('error', function() {
                 var args = Array.prototype.splice.call(arguments, 0);
                   args.unshift('error');
                     self.emit.apply(self, args);
                      });
}

_deflater.prototype = new process.EventEmitter();



exports.inflater = function(stream) {
     return new _inflater(stream);
};

exports.deflater = function(stream) {
     return new _deflater(stream);
};
