
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
        this.clients[client.sessionId] = client;
        this.sendMessage(client.sessionId, 'Init', {sessionId : client.sessionId});
        this.log('Welcome to Proxy Intercept', client.sessionId);
        
        client.on('message', function(data){
            this.emit(data.handler, data.payload, client);
        }.bind(this));

        client.on('disconnect', function(){
            this.removeClient(client);
        }.bind(this));

    };

    this.removeClient = function(client) {
        delete this.clients[client.sessionId];
        this.log('Diconnecting client '+client.sessionId+' from Proxy Listener', client.sessionId);
    };

    this.sendMessage = function(sessionId, handlerName, msgObj) {
    
        if (this.clients[sessionId]) {   
            this.clients[sessionId].send({
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
    socket.on('connection', function(client){
        clientTransport.addClient(client);
        clientTransport.log('Connection to Proxy Intercept has been established with  session ID '+client.sessionId);
    });

    return clientTransport;
};
