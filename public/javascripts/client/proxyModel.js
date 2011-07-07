
var ProxyControls = Backbone.View.extend({

    initialize: function(){
        this.proxyView = new ProxyView({el : $('#proxyView')[0], collection : proxies});
        this.consoleView = new LogView({el: $('#consoleView')[0], collection : logs});
        this.interceptView = new InterceptView({el : $('#inerceptView')[0]});
        this.activeView = this.proxyView;

        this.topCommands = new CommandCollection({
                commands : [$('#proxy')[0], $('#console')[0], $('#inercept')[0]], 
                hovorClass : 'over',
                activeClass : 'selected',
                callback : this.activateView.bind(this)
        });
    },
    
    activateView : function(elem) { 
        $(this.activeView.el).fadeToggle(500, function() {
            this.activeView = this[elem.id+'View'];
            $(this.activeView.el).fadeToggle();
        }.bind(this));
    }

});

var InterceptView = Backbone.View.extend({
    initialize : function() {
    
    }
});


var LogMessage = Backbone.Model.extend({});
var LogCollection = Backbone.Collection.extend({
     model: LogMessage
});
var logs = new LogCollection;
var LogView = Backbone.View.extend({
    initialize : function() {
        this.collection.bind('add', this.add.bind(this));
    },
    add : function(logMsg) {
        $(this.el).prepend('<div>'+logMsg.get('msg')+'</div>');
    }
});



var ProxyMessage = Backbone.Model.extend({});
var ProxyCollection = Backbone.Collection.extend( {
    model : ProxyMessage
});
var proxies = new ProxyCollection();
var RequestView = Backbone.View.extend({
    initialize : function() {
        this.template =  $('#tmpl-responseTmpl')[0].innerHTML;
        this.model.set({'requestHeadersArr' :  _.convertObjToArr(this.model.get('requestHeaders'))});
        this.model.set({'responseHeadersArr' :  _.convertObjToArr(this.model.get('responseHeaders'))});
        this.model.bind('change:data', this.dataChange.bind(this));
    },
    
    events : {
        'click div.responseUrl' : 'open'
    },

    render : function() {
        $(this.el).html(Mustache.to_html(this.template, this.model.toJSON()));  
        return this;
    },

    postRender : function() {
        var btns = _.reIdArr($(this.el).find('.requestConrols').find('.reqBtn'));
        this.btns = new CommandCollection({
                commands : btns,
                hovorClass : 'over',
                activeClass : 'selected',
                callback : this.activateBtn.bind(this)
        });
        this.activeView = $(this.el).find('.requestHeaders');
    },
    
    open : function() {
        $(this.el).find('.responseDetails').fadeToggle();
        socket.send({index : this.model.get('index'), sessionId : sessionId})
    },

    dataChange : function(model , data) {
        console.log(model.get('data').length);
        $(this.el).find('.responseData').html(model.escape('data'));
    },

    activateBtn : function(elem) {
        this.activeView.fadeToggle(500, function() {
            this.activeView = $(this.el).find('.'+$(elem).attr('cmd')).fadeToggle();   
        }.bind(this));
    }
});

var ProxyView = Backbone.View.extend({
    initialize : function() {
        this.requests = [];
        this.collection.bind('add', this.add.bind(this));
    },

    add : function(proxyMessage) {
        var request = new RequestView({
           model : proxyMessage
        });
        this.requests.push(request);
        $(this.el).prepend(request.render().el);
        if (request.postRender) request.postRender();
    }
});







