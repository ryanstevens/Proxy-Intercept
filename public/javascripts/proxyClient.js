String.prototype.htmlEncode = function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

var handlers = {
    onLog : function(res) {
    
    },

    onResponseData : function(res) {
    },
    
    onGet : function(res) {
        var connTmpl = $('connectionTemplate');
        var connDiv = $('connections');

        var responseNode = connTmpl.cloneNode(true);
        responseNode.id = 'response_'+res.id;
        responseNode.innerHTML = '<div class="urlResponse">'+res.url+'</div>';
        responseNode.style.display = '';

        if (!this.lastResponse)
            connDiv.appendChild(responseNode);
        else
            connDiv.insertBefore(responseNode, this.lastResponse);              
        
        this.lastResponse = responseNode;
   }

};


var socket = new io.Socket();
var connected = false;
socket.on('connect', function(){
    connected = true;
});

socket.on('message', function(data){
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


