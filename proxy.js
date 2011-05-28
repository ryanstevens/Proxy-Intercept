var sys = require('sys'); 
var profiler =  require("v8-profiler");
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
        this.clients = [];
        var currentId = 0;
        var self = this;

        this.getNextId = function() {
            return ++currentId;
        };

        this.sendToClients = function(objToSend) {
            this.clients.forEach(function(client) {
                client.send(objToSend);
            });
        };

        this.sendRequest = function(reqObj) { 
            reqObj.handler = 'ResponseData';
            this.sendToClients(reqObj);
        };

        this.addClient = function(client) {
            this.clients.push(client);
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
            proxyReq.on('response', function (res) {
         
                reqObj.responseHeaders = res.headers;
                reqObj.handler = 'Get';
                self.sendToClients(reqObj);
                
                if (res.headers['content-encoding'] === 'gzip'){
                    res = gz.inflater(res);
                }
            
                res.addListener('data', function(chunk) {
                    if (reqObj.isText && chunk) {
                        reqObj.data += chunk;  
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
        
        curReq.isText = (proxy_response.headers['content-type'] && proxy_response.headers['content-type'].indexOf('text') >=0 
            && request.url.indexOf('.jpg')==-1 && request.url.indexOf('.gif')==-1 && request.url.indexOf('.png')==-1);
        
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
app.listen(3000);


var socket = io.listen(app); 
socket.on('connection', function(client){
        client.send({handler : 'Log' , msg : 'Welcome to Proxy Intercept'});
        proxyCache.addClient(client);

        client.on('message', function(data){
            client.send(data.toString());
        }); 
        client.on('disconnect', function(){
            
        }); 
}); 


sys.puts('Server running at http://'+ipAddr+':'+port+'/');

