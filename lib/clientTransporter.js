
var transporter = function() {

    this.clients = {};

    this.sendToClients = function(handlerName, objToSend) {
 
        for (var sessionId in this.clients) {
            try
            {
                this.sendMessage(sessionId, handlerName, objToSend);
            }
            catch(e) {
                console.log('Cannot send data '+e.message);
            }
        }
    };


    this.addClient = function(client) {
        this.clients[client.id] = client;
        this.sendMessage(client.id, 'Init', {sessionId : client.id});
        this.log('Welcome to Proxy Intercept', client.id);
        
        client.on('message', function(data){
            this.emit(data.handler, data.payload, client);
        }.bind(this));

        client.on('disconnect', function(){
            this.removeClient(client);
        }.bind(this));

    };

    this.removeClient = function(client) {
        delete this.clients[client.sessionId];
        this.log('Diconnecting client '+client.id+' from Proxy Listener', client.id);
    };

    this.sendMessage = function(sessionId, handlerName, msgObj) {
        
        if (this.clients[sessionId]) {   
            this.clients[sessionId].json.send({
                handler : handlerName, 
                payload: msgObj
            });
        }
    };


    this.log = function(msg, clientId) {
        if (clientId)
            this.sendMessage(clientId, 'Log', {msg: msg});
        else
            this.sendToClients('Log', {msg : msg});
        console.log(msg);
    };
        
};

transporter.prototype = new process.EventEmitter();
var clientTransport = new transporter();

exports.getInstance = function(socket) {
    socket.sockets.on('connection', function(client){
        clientTransport.addClient(client);
        clientTransport.log('Connection to Proxy Intercept has been established with  session ID '+client.id);
    });

    return clientTransport;
};
