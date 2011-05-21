String.prototype.htmlEncode = function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

var handlers = {
    onLog : function(res) {
        alert(res.msg);
    },

    onResponseData : function(res) {
        document.getElementById('connections').innerHTML += '<pre>' +res.data.htmlEncode() + '</pre>';
    },
    
    onGet : function(res) {
        document.getElementById('connections').innerHTML = '<pre>' +res.url + '</pre>'+ document.getElementById('connections').innerHTML;
    }

};


var socket = new io.Socket();
socket.on('connect', function(){});

socket.on('message', function(data){
    handlers['on'+data.handler].call(handlers, data);
});


