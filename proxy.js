var gz = require('./gzip.js');
var http = require('http');

var proxyCache = (function(){

    var proxy = function() {

        this.requests = [];
        this.clients = {};
        var currentId = 0;
        var self = this;

        this.getNextId = function() {
            return currentId++;
        };

        this.sendToClients = function(objToSend) {
            for (var sessionId in this.clients) {
                try
                {
                    this.clients[sessionId].send(objToSend);
                }
                catch(e) {
                    console.log('Cannot send data '+e.message);
                }
            }
        };

        this.sendRequest = function(reqObj) {
            reqObj.handler = 'ResponseData';
            this.sendToClients(reqObj);
        };

        this.addClient = function(client) {
            this.clients[client.sessionId] = client;
        };

        this.removeClient = function(client) {
            delete this.clients[client.sessionId];
            this.log('Diconnecting client '+client.sessionId+' from Proxy Listener');
        };

        this.getResponseData = function(index, sessionId) {
            var request = this.requests[index];
            if (!request)
                return;

            request.handler = 'UpdateData';
            this.log('Sending response stream to '+sessionId+ ' for '+request.url);
            return request;
        };

        this.log = function(msg) {
           this.sendToClients({handler : 'Log', msg : msg});
        };
        
        this.addRequest = function(originalReq, proxyReq) {
            var reqObj = {
                id : this.getNextId(),
                url : originalReq.url,
                data : '',
                method: originalReq.method,
                requestHeaders : originalReq.headers,
                responseHeaders : null
            };

            this.requests.push(reqObj);
            reqObj.index = this.requests.length-1;

            proxyReq.on('response', function (res) {

                reqObj.responseHeaders = res.headers;
                reqObj.handler = 'Get';

                self.sendToClients(reqObj);

                if (res.headers['content-encoding'] === 'gzip'){
                    res = gz.inflater(res);
                }

                res.addListener('data', function(chunk) {
                    if (typeof chunk === 'string') {
                        reqObj.data += chunk;
                    }
                    else {
                        reqObj.data += chunk.toString('utf8');
                    }

                });


            });

            return reqObj;
        };  
    };
    return new proxy();
})();

exports.ProxyServer = (function() {

    var server = function() {
        
        this.createRequest = function(request) {
            
            var proxyClient = http.createClient(80, request.headers['host']);

            proxyClient.on('error', function(er){
                this.emit('error', er)    
            }.bind(this));

            var proxy_request = proxyClient.request(request.method, request.url, request.headers);
            proxyCache.addRequest(request, proxy_request);
    
            return proxy_request;
        };

        var proxyResponse = function(proxyRes) {

            ['headers', 'statusCode'].forEach(function(prop) {
                this[prop] = proxyRes[prop];
            }.bind(this));


            proxyRes.on('data', function(chunk) {

                this.emit('data', chunk);

            }.bind(this));

            proxyRes.on('end', function() {

                this.emit('end');

            }.bind(this));
        };

        proxyResponse.prototype = process.EventEmitter();
        this.createResponse = function(proxyRes) {
            return new proxyResponse(proxyRes);
        };
    };

    server.prototype = process.EventEmitter();
    return new server();

})();



exports.proxyCache = proxyCache;
