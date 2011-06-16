var sys = require('sys'); 
//var profiler =  require("v8-profiler");
var http = require('http');
var net = require('net');
var url = require('url');
var io = require('socket.io');
var express = require('express');
var proxy = require('./proxy.js');
var ipAddr = '127.0.0.1';
var port = 8080;

var ProxyServer = proxy.ProxyServer;
var proxyCache = proxy.proxyCache;
var server = http.createServer(function(request, response) {

    
    var proxy_request = ProxyServer.createRequest(request);
    proxy_request.on('error', function(er){
        response.end();
    });  

    proxy_request.on('response', function (proxy_response) {
 
        proxy_response = ProxyServer.createResponse(proxy_response);       
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

app.listen(80);


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

