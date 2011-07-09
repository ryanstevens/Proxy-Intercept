String.prototype.htmlEncode = function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

var sessionId;
var handlers = {
    testItr : 0,
    onInit : function(res) {
        sessionId = res.sessionId;
        this.startTest = (new Date()).getTime();

        for (var i=1; i<=0; i++) 
        {   
            this.testItr++;
            socket.send({'handler' : 'Test', payload : i});
        }
    },

    onTest : function(res) {
        this.testItr--;
        if (this.testItr == 0)
        {
            console.log(((new Date()).getTime() - this.startTest) / 1000);
        }
    },
    
    onLog : function(res) {
        logs.add(new LogMessage(res));
    },

    onResponseData : function(res) {
    },
   
    onGet : function(res) {
        proxies.add(new ProxyMessage(res));
    },

    onUpdateData : function(res) {
        proxies.get(res.id).set(res);
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
        return console.log('data is undefined');
    if (!data.handler)
        return console.log('no handler defined');
    if (!handlers['on'+data.handler])
        return console.log(data.handler + ' not implemented');
 
    handlers['on'+data.handler](data.payload);
});

socket.on('disconnect', function() {
    tryReconnect();
    connected = false;
});


