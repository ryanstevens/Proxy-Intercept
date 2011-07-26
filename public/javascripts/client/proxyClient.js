String.prototype.htmlEncode = function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};
//only record the first session
var sessionId = null; 
var handlers = {
    onInit : function(res) {
        console.log('inited');
        if (!sessionId) {
            sessionId = res.sessionId;
            socket.json.send({handler: 'fetchIntercepts', payload : {}});
        }

    },

    onLoadIntercepts : function(interceptModels) {

        _.each(interceptModels, function(model) {
            intercepts.add(new ProxyMessage(model));
        });
    },

    onLog : function(res) {
        logs.add(new LogMessage(res));
    },

    onResponseData : function(res) {
    },
   
    onGet : function(res) {
        proxies.add(new ProxyMessage(res));
    },

    onAlert : function(res) {
        alert(res);
    },

    onIntercept : function(res) {
        InterceptFunctions.trigger(res);
    },

    onUpdateData : function(res) {
        proxies.get(res.id).set(res);
    },

    onUpdateIntercept : function(res) {
        var intercept = intercepts.get(res.id);
        if (intercept) 
            intercept.set(res, {silent: false});
        else
            intercepts.add(res);
    },

    onDeleteIntercept : function(res) {
        var intercept = intercepts.get(res.id);
        if (intercept) 
            intercepts.remove(intercept);
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


