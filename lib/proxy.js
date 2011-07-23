var gz = require('./gzip.js');
var http = require('http');

var proxyCache = (function(){

    var proxy = function() {
        
        this.requests = [];
        var ipTable = {};
        var currentId = 0;

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

                sendCachedResponse(obj.index, client.id);

            });

            this.transport.on('new_ip', function(ip, client) {
                if (this.hasIP(ip))
                    return;
                ipTable[ip] = client;
                this.transport.log('new ip:'+ip);
            }.bind(this));
        };

        this.hasIP = function(ip) {
           return (ipTable[ip]); 
        };  
       
        this.addRequest = function(originalReq, proxyReq) {
            var reqObj = {
                id : this.getNextId(),
                url : originalReq.url,
                data : [],
                gen : 0,
                index : this.requests.length,
                method: originalReq.method,
                requestHeaders : originalReq.headers
            };
            this.requests.push(reqObj);


            proxyReq.on('response', function (res) {

                reqObj.responseHeaders = res.headers;
                this.transport.sendToClients('Get', reqObj);

                if (res.headers['content-encoding'] === 'gzip'){
                    res = gz.inflater(res);
                }

                res.addListener('data', function(chunk) {
                    reqObj.data.push( (typeof chunk === 'string') ? chunk : chunk.toString('utf8') );
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
            
            if (false && !proxyCache.hasIP(request.connection.remoteAddress)) {
                return null;
            }
                       
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



