var gz = require('./gzip.js');
var http = require('http');

var proxyCache = (function(){

    var proxy = function() {

        this.requests = [];
        var currentId = 0;
        var self = this;

        this.getNextId = function() {
            return currentId++;
        };

        this.sendRequest = function(reqObj) {
            this.transport.sendToClients('ResponseData', reqObj);
        };

        var sendCachedResponse = function(index, sessionId) {
            var request = this.requests[index];
            if (!request)
                return;

            request.gen++;
            this.transport.sendMessage(sessionId, 'UpdateData', request);
            this.transport.log('Sending response stream to '+sessionId+ ' for '+request.url);
        }.bind(this);

        this.setTransport = function(transport) {
            this.transport = transport;
            this.transport.on('GetRequest', function(obj, client) {

                sendCachedResponse(obj.index, client.sessionId);

            });
        };
        
        this.addRequest = function(originalReq, proxyReq) {
            var reqObj = {
                id : this.getNextId(),
                url : originalReq.url,
                data : '',
                gen : 0,
                method: originalReq.method,
                requestHeaders : originalReq.headers,
                responseHeaders : null
            };

            this.requests.push(reqObj);
            reqObj.index = this.requests.length-1;

            proxyReq.on('response', function (res) {

                reqObj.responseHeaders = res.headers;

                self.transport.sendToClients('Get', reqObj);

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

exports.createServer = function(transport) {
    
    proxyCache.setTransport(transport);

    var server = function() {
        
        this.createRequest = function(request) {
            
            var proxy_request = http.request({
                    host : request.headers['host'],
                    port : request.port,
                    method : request.method,
                    path : request.url,
                    headers : request.headers
                }
            );

            proxyCache.addRequest(request, proxy_request);
            return proxy_request;
        };

        var proxyResponse = function(proxyRes) {

            ['headers', 'statusCode'].forEach(function(prop) {
                this[prop] = proxyRes[prop];
            }.bind(this));

            
            ['error', 'data', 'end'].forEach(function(eventName) {
                proxyRes.on(eventName, function(arg) {
                   this.emit(eventName, arg);     
                }.bind(this));
            }.bind(this));

            proxyRes.on('close', function () {
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

};



