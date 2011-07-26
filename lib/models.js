
var _ = require('underscore')._,
    Backbone = require('backbone');



var ProxyMessage  = Backbone.Model.extend({ 

    initialize : function() {

    },

    isRegexMatch : function(url) {

        if (this.get('regex')) {
            var r = new RegExp(this.get('regex'));
            if (r.test(url))
                return true;
        }

        return false;
    }

});

var ProxyCollection = Backbone.Collection.extend( {
        model : ProxyMessage
});     


exports.ProxyMessage = ProxyMessage;
exports.ProxyCollection = ProxyCollection;
