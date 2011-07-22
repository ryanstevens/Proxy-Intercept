String.prototype.htmlEncode = function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

var handlers = {
    testItr : 0,
    ff:0,
    onInit : function(res) {
    
        console.log('inited');    
           this.startTest = (new Date()).getTime();

        for (var i=1; i<=3000; i++) 
        {   
            this.testItr++;
            socket.json.send({'handler' : 'Test', payload : i});
        }
    },

    onTest : function(res) {
        this.testItr--;
       this.ff++;
        if (this.testItr == 0)
        {
            console.log(this.ff+":"+((new Date()).getTime() - this.startTest) / 1000);
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


