
var ProxyControls = Backbone.View.extend({

    initialize: function(){
        this.proxyView = new ProxyView({el : $('#proxyView')[0], collection : proxies});
        this.consoleView = new LogView({el: $('#consoleView')[0], collection : logs});
        this.activeView = this.proxyView;

        this.topCommands = new CommandCollection({
                commands : [$('#proxy')[0], $('#console')[0]],
                hovorClass : 'over',
                activeClass : 'selected',
                callback : this.activateView.bind(this)
        });
    },
    
    events : {
        'click div' : 'topShow',
        'mouseover div' : 'topOver',
        'mouseout div' : 'topOut'
    },

    topOver : function (event) {
        this.topCommands.over(event.target);
    },

    topOut : function (event) {
        this.topCommands.out();
    },

    topShow : function(event) { 
        this.topCommands.toggleActive(event.target);
    },

    activateView : function(commandName) { 
        $(this.activeView.el).fadeToggle(500, function() {
            this.activeView = this[commandName+'View'];
            $(this.activeView.el).fadeToggle();
        }.bind(this));
    },

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
    },

    events : {
        'click div' : 'open'
    },

    render : function() {
        $(this.el).html(Mustache.to_html(this.template, this.model.toJSON()));     
        return this;
    },

    open : function() {
        $(this.el).find('.responseDetails').fadeToggle();
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
    }
});







