var sys = require('sys'); 
//var profiler =  require("v8-profiler");
var http = require('http');
var net = require('net');
var url = require('url');
var gz = require('./gzip.js');
var io = require('socket.io');
var express = require('express');
var ipAddr = '127.0.0.1';
var port = 8080;
    

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
            this.log('Sending response stream to '+sessionId);
            var request = this.requests[index];
            request.handler = 'UpdateData';
            return request;
        };

        this.log = function(msg) { 
           console.log(msg);
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
                    //only worry about text           
                    if (typeof chunk === 'string') {
                        reqObj.data += chunk;  
                        self.log('Writing data for '+originalReq.url+'   :    '+reqObj.url);
                    }
                   
                });
            

            });
    
            return reqObj;
        };   
    };
    return new proxy();
})();


var server = http.createServer(function(request, response) {
    var proxy = http.createClient(80, request.headers['host']);

    proxy.on('error', function(er){
        response.end();
    });  

    var proxy_request = proxy.request(request.method, request.url, request.headers);
    var curReq = proxyCache.addRequest(request, proxy_request);

    proxy_request.on('response', function (proxy_response) {
        
        proxy_response.addListener('data', function(chunk) {
            response.write(chunk);
        });
     
        proxy_response.addListener('end', function() {
            response.end();
        });
         
        response.writeHead(proxy_response.statusCode, proxy_response.headers);
    });

    request.on('end', function() {
      proxy_request.end();
    });
});

server.listen(port);

var app = express.createServer();
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
    res.render('index.jade', { pageTitle: 'My Site' });
});

app.listen(8000);


var socket = io.listen(app); 
socket.on('connection', function(client){
        proxyCache.log('Welcome to Proxy Intercept.  You session ID is '+client.sessionId);
        proxyCache.addClient(client);
        proxyCache.sendToClients({ handler : 'Init', sessionId : client.sessionId}, client.sessionId);

        client.on('message', function(data){
            if (data && data.index>=0)
                client.send(proxyCache.getResponseData(data.index, data.sessionId));
        }); 

        client.on('disconnect', function(){
            proxyCache.removeClient(client);  
        }); 
}); 


sys.puts('Server running at http://'+ipAddr+':'+port+'/');

