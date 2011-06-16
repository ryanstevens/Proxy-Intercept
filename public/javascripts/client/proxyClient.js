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
var connected = false;
socket.on('connect', function(){
    connected = true;
});

socket.on('message', function(data){
    if (!handlers['on'+data.handler])
        alert(data.handler + ' not implemented');
    handlers['on'+data.handler](data);
});

socket.on('disconnect', function() {
    connected = false;
    tryConnect();
});


var pageLoaded = false;
function tryConnect() {
    if (connected)
        return;

    try
    {
        socket.connect();
        if (!pageLoaded) pageLoaded = true;
    }
    catch(e) {}   
    setTimeout('tryConnect()', 3000);
}


