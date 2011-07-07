String.prototype.htmlEncode = function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

var sessionId;
var handlers = {
    onInit : function(res) {
        sessionId = res.sessionId;
    },
    
    onLog : function(res) {
        logs.add(new LogMessage(res));
    },

    onResponseData : function(res) {
    },
   
    onGet : function(res) {
        proxies.add(new ProxyMessage(res));
    },

    onUpdateData : function(res)
    {
        console.log(res.id+"::"+res.data.length);
        proxies.get(res.id).set({'data': res.data});
    }
};


var socket = new io.Socket();
var disconnectedTimeout = null;
var connected = false;

var connect = function() {

  if (!connected) {
        console.log('trying to connect');
        socket.connect();
        tryReconnect();
  }
    
};

var tryReconnect = function() { 
    disconnectedTimeout = setTimeout(connect, 5000);
};

socket.on('connect', function(){
    console.log('connected');
});

socket.on('message', function(data){
    //only clear timeout when you get proof there is an active connection
    if (disconnectedTimeout) {
        disconnectedTimeout = true;
        connected = true;
        clearTimeout(disconnectedTimeout);
    }
   
    if (data == null || !data)
        console.log('data is undefined');
    if (!data.handler)
        console.log('no handler defined');
    if (!handlers['on'+data.handler])
        console.log(data.handler + ' not implemented');
 
    handlers['on'+data.handler](data);
});

socket.on('disconnect', function() {
    tryReconnect();
    connected = false;
});


