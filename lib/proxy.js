var gz = require('./gzip.js');
var http = require('http');
var models  = require("./models.js");
var _ = require('underscore')._;


var proxyCache = (function(){

    var ClientResponse = function() {

    };
    ClientResponse.prototype = process.EventEmitter();
    var ClientRequest = function() {
    
    };
    ClientRequest.prototype = process.EventEmitter();
    
    var proxy = function() {
        
        this.requests = new models.ProxyCollection();
        var ipTable = {};
        var currentId = 0;
        this.intercepts = new models.ProxyCollection();
        //in case someone really wants it
        var self = this;

        this.getNextId = function() {
            return currentId++;
        };

        this.sendRequest = function(reqObj) {
            this.transport.sendToClients('ResponseData', reqObj);
        };

        var sendCachedResponse = function(index, sessionId) {
            var request = this.requests.get(index);
            if (!request)
                return;

            request.set({'gen' : request.get('gen')+1});;
            this.transport.sendMessage(sessionId, 'UpdateData', request.toJSON());
            this.transport.log('Sending response stream to '+sessionId+ ' for '+request.toJSON().url);
        }.bind(this);

        this.setTransport = function(transport) {
            this.transport = transport;
            this.transport.on('GetRequest', function(obj, client) {

                sendCachedResponse(obj.index, client.id);

            });
            
            this.transport.on('registerIntercept', function(intercept, client) {
                
                var proxyMessage = this.requests.get(intercept.id);
                proxyMessage.set(intercept);

                if (!this.intercepts.get(proxyMessage.id))   
                    this.intercepts.add(proxyMessage);               
             
                this.transport.sendAlert(client.id, 'Intercept Registered');
                this.transport.broadcast(client.id, 'UpdateIntercept', proxyMessage.toJSON());               
            }.bind(this));

            this.transport.on('clientResponse', function(response, client) {

                this.intercepts.get(response.proxyMessageId).trigger('response', response);

            }.bind(this));
    
            this.transport.on('fetchIntercepts', function(response, client) {
                var interceptModels = [];
                _.each(this.intercepts.models, function(intercept) {
                    interceptModels.push(intercept.toJSON());
                });

                this.transport.sendMessage(client.id, 'LoadIntercepts', interceptModels);

            }.bind(this));
            
            this.transport.on('new_ip', function(ip, client) {
                this.transport.log('IP:'+ip);
                if (this.hasIP(ip))
                    return;
                ipTable[ip] = client;
            }.bind(this));

            this.transport.on('deleteProxy', function(intercept, client) {

                this.intercepts.remove(this.intercepts.get(intercept.id));
                
            }.bind(this));
        };

        this.intercepts.bind('remove', function(intercept) {
            this.transport.broadcast('remove', intercept);
        }.bind(this));

        //gets the intercepted response from the client
        this.getClientRequest = function(proxyMessage) {
            
            var transport = this.transport;
            var request = new ClientRequest();
            request.end = function() {
             
                proxyMessage.unbind('response');
                proxyMessage.bind('response', function(responseObj) {
                    
                    var response = new ClientResponse();
                    response.statusCode = proxyMessage.get('statusCode');
                    response.headers = responseObj.headers;
                    //who needs gzip on a dev tool 
                    if (response.headers['content-encoding'])
                        delete response.headers['content-encoding'];

                    request.emit('response', response);

                    response.emit('data', responseObj.responseText);
                    response.emit('end');
                 
                    //send a new request to the viewer
                    var newReq = proxyMessage.clone();
                    newReq.set({
                        id : self.getNextId(),
                        index : self.requests.length 
                    }); 
                    self.requests.add(newReq);
                    self.transport.sendToClients('Get', newReq.toJSON());
                });
             
                //proxyMessage.trigger('response', {responseText: '<html><body>hello world</body></html>', responseHeaders: proxyMessage.get('responseHeaders')});
                transport.sendToClients('Intercept', proxyMessage.toJSON());
            };
            return request;
        };

        this.hasIP = function(ip) {
           return (ipTable[ip]); 
        };  
       
        this.addRequest = function(originalReq, proxyReq) {
            var reqObj = new models.ProxyMessage({
                id : this.getNextId(),
                url : originalReq.url,
                data : [],
                gen : 0,
                index : this.requests.length,
                method: originalReq.method,
                requestHeaders : originalReq.headers
            });
            this.requests.add(reqObj);

            proxyReq.on('response', function (res) {

                reqObj.set({'responseHeaders' : res.headers, 'statusCode' : res.statusCode});
                this.transport.sendToClients('Get', reqObj.toJSON());

                if (res.headers['content-encoding'] === 'gzip'){
                    res = gz.inflater(res);
                }

                res.addListener('data', function(chunk) {
                    var data = reqObj.get('data');
                    data.push((typeof chunk === 'string') ? chunk : chunk.toString('utf8') );
                    reqObj.set({'data': data});
                });
            }.bind(this));

            return reqObj;
        };  
   
    };
    return new proxy();
})();


exports.createServer = function(transport) {
    
    proxyCache.setTransport(transport);
    
    var server = function() {
        this.createRequest = function(request) {
            
            if (!proxyCache.hasIP(request.connection.remoteAddress)) {
                return null;
            }
 
            var interceptsToApply = [];
            _.each(proxyCache.intercepts.models, function(intercept) {
                if (intercept.isRegexMatch(request.url)) interceptsToApply.push(intercept);
            });

            if (interceptsToApply.length === 0) {
                var proxy_request = http.request({
                        host : request.headers['host'],
                        port : request.port,
                        method : request.method,
                        path : request.url,
                        headers : request.headers
                });

                proxyCache.addRequest(request, proxy_request);
                return proxy_request;
            }
            else {
                return proxyCache.getClientRequest(interceptsToApply[0]);
            }
        };

    };

    server.prototype = process.EventEmitter();
    return new server();

};



