String.prototype.htmlEncode = function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

var handlers = {
    onInit : function(res) {
        console.log('inited');    
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


var socket;
function connect() {

    socket = io.connect();
    socket.on('connect', function(){
        console.log('connected');
    });

    socket.on('message', function(data){
   
        if (data == null || !data)
            return console.log('data is undefined');
        if (!data.handler)
            return console.log('no handler defined');
        if (!handlers['on'+data.handler])
            return console.log(data.handler + ' not implemented');
 
        handlers['on'+data.handler](data.payload);
    });


}


