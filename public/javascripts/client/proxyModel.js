
var ProxyControls = Backbone.View.extend({

    initialize: function(){
        this.proxyView = new ProxyView({el : $('#proxyView')[0], collection : proxies});
        this.consoleView = new LogView({el: $('#consoleView')[0], collection : logs});
        this.interceptView = new InterceptView({el : $('#interceptView')[0], collection : intercepts});
        this.activeView = this.proxyView;

        this.topCommands = new CommandCollection({
                commands : [$('#proxy')[0], $('#console')[0], $('#intercept')[0]], 
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

var LogMessage = Backbone.Model.extend({});
var LogCollection = Backbone.Collection.extend({
     model: LogMessage
});
var logs = new LogCollection();
var LogView = Backbone.View.extend({
    initialize : function() {
        this.collection.bind('add', this.add.bind(this));
    },

    add : function(logMsg) {
        $(this.el).prepend('<div>'+logMsg.get('msg')+'</div>');
    }
});



var ProxyMessage = Backbone.Model.extend({
    isInterceptOwner : function() {
        return (sessionId === this.get('sessionOwner'));   
    }
});
var ProxyCollection = Backbone.Collection.extend( {
    model : ProxyMessage
});
var proxies = new ProxyCollection();
var RequestView = Backbone.View.extend({
    initialize : function() {
        this.template =  $('#tmpl-responseTmpl')[0].innerHTML;
        this.model.set({'requestHeadersArr' :  _.convertObjToArr(this.model.get('requestHeaders'))});
        this.model.set({'responseHeadersArr' :  _.convertObjToArr(this.model.get('responseHeaders'))});
        this.model.bind('change', this.dataChange.bind(this));
        this.model.bind('change:display', this.render.bind(this));
    },
    
    events : {
        'click div.responseUrl' : 'open',
        'click span.copyIntercept' : 'copyIntercept'
    },

    render : function() {
        $(this.el).html(Mustache.to_html(this.template, this.model.toJSON()));  
        if (!this.model.get('display'))
            $(this.el).hide();
        else
            $(this.el).show(); 
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

        if (!this.isOpen)
            this.trigger('pauseStream');

        this.isOpen = !(this.isOpen);
        $(this.el).find('.responseDetails').fadeToggle();
        var idx = this.model.get('index');
        socket.json.send({handler : 'GetRequest', payload : {index: idx}});
    },

    copyIntercept : function() {
        intercepts.add(this.model);
        proxyControls.topCommands.toggleActive($('#intercept')[0]);
    },

    dataChange : function(model) {
        $(this.el).find('.responseData').html(escapeHTML(model.get('data').join('')));
    },

    activateBtn : function(elem) {
        this.activeView.fadeToggle(500, function() {
            this.activeView = $(this.el).find('.'+$(elem).attr('cmd')).fadeToggle();   
        }.bind(this));
    }
});

var ProxyView = Backbone.View.extend({
    initialize : function() {
        this.collection.bind('add', this.add.bind(this));
    },

    events : {
        'click span#status' : 'stream'
    },

    setStreamTxt : function(txt) {
        $('#status')[0].innerHTML = txt;
    },

    stream : function() {
        if (this.streamPaused) {
            this.streamPaused = false;
            this.setStreamTxt('Streaming');

            _.each(this.collection.models, function(req) {
                if (!req.get('display'))
                    req.set({'display': true}, {silent: true});  
            });
        }
        else
            this.pauseStream();
    },

    pauseStream : function() {
        this.streamPaused = true;
        this.setStreamTxt('Paused');
    },

    add : function(proxyMessage) {
        proxyMessage.set({'display' : !(this.streamPaused)}, {silent: true});
        var request = new RequestView({
           model : proxyMessage
        });

        request.bind('pauseStream', function() {
            this.pauseStream();
        }.bind(this));

        $('#responseContainer').prepend(request.render().el);
        request.postRender();
    }
});


var InterceptCollection = Backbone.Collection.extend( {
    model : ProxyMessage
});
var intercepts = new InterceptCollection();


var InterceptView = Backbone.View.extend({
    initialize : function() {
        this.collection.bind('add', this.add.bind(this));
    },

    add : function(interceptModel) {
        var item = new InterceptItem({
            model : interceptModel
        });

        item.bind('itemOpen', function() {
            if (this.detail) this.detail.destroy();

            this.detail = new InterceptDetail({
                model : interceptModel 
            });
            $('#interceptDetail').append(this.detail.render().el);
            this.detail.postRender();
        }.bind(this));
        $('#interceptList').prepend(item.render().el);
    }
});

var InterceptItem = Backbone.View.extend({
    initialize : function() {
        this.template =  $('#tmpl-intercept')[0].innerHTML;
        this.model.bind('change', this.render.bind(this));    
    },

    events : {
        'click' : 'itemOpen'
    },

    itemOpen : function() {
        this.trigger('itemOpen', this.model);          
    },

    render : function() {

        $(this.el).html(Mustache.to_html(this.template, flattenObj(this.model.toJSON())));
        this.el.className =  'interceptItem';
        if (this.model.isInterceptOwner())
            $(this.el).addClass('owner');
        
        return this;
    }
});

var InterceptFunctions = {
    
    register : function(id, callback) {
        if (!this.intercepts) {
            this.intercepts = {};
        }

        this.intercepts[id] = callback;
    },

    trigger : function(interceptObj) {
        var intercept = intercepts.get(interceptObj.id);
        if (!intercept)
            return;

        intercept.set(interceptObj, {silent: false});
        if (interceptObj.sessionOwner !== sessionId)
            return;

        var returnObj= this.intercepts[interceptObj.id].call(intercept, 
            intercept.get('url'), 
            intercept.get('requestHeaders'), 
            intercept.get('responseHeaders'), 
            intercept.get('data').join(''));

        returnObj.proxyMessageId = interceptObj.id;
        socket.json.send({handler : 'clientResponse', payload : returnObj}); 
    }
};

var InterceptDetail = Backbone.View.extend({

    initialize : function() {
        this.template = $('#tmpl-interceptDetail')[0].innerHTML;
        this.model.bind('change', this.render.bind(this));
    },

    events : {
        'click .save' : 'save'
    }, 

    save : function() { 
        this.model.set({'sessionOwner': sessionId, 
                        'regex' : $(this.el).find('.regexInput')[0].value, 
                        'gen' : (this.model.get('gen')+1),
                        'customCode': $(this.el).find('.code').find('textarea')[0].value}, {silent: false});       
 
        eval( 'InterceptFunctions.register('+this.model.get('id')+' ,  function(url, requestHeaders, responseHeaders, data) { '+
                   'var resObj = { headers : responseHeaders, responseText : data };' + 
                   this.model.get('customCode')+
                   'return resObj;})');       
        
        socket.json.send({handler : 'registerIntercept', payload : this.model.toJSON()});
    },

    render : function() {
        $(this.el).html(Mustache.to_html(this.template, this.model.toJSON()));
        $(this.el).find('.responseData').html(escapeHTML(this.model.get('data').join('')));
        if (this.model.toJSON()['regex']) $(this.el).find('.regexInput')[0].value = this.model.get('regex');
        if (this.model.toJSON()['customCode']) $(this.el).find('.code').find('textarea')[0].value = this.model.get('customCode');
        
       
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
        this.activeView = $(this.el).find('.intercept');
    },

    activateBtn : function(elem) {
        this.activeView.fadeToggle(500, function() {
            this.activeView = $(this.el).find('.'+$(elem).attr('cmd')).fadeToggle();
        }.bind(this));
    },

    destroy: function() {
        $(this.el).hide();
    }
});



