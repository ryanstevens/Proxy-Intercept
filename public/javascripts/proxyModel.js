

var NavView = Backbone.View.extend({

    initialize: function(){
        this.render();
        this.connections = $('#connections');
        this.console = $('#consoleLogs');
        this.activeView = this.connections;
        this.activeBtn = $('#proxy');
        this.activeBtn.id = 'proxy';
    },
    
    render : function() {
    },

    events : {
        'click div[id=proxy]' : 'showProxy',
        'click div[id=console]' : 'showConsole',
        'mouseover div' : 'over',
        'mouseout div' : 'out'
    },

    over : function (event) {
        var targetId = event.target.id;
        if (this.activeBtn.id === targetId) return;
        this.hovered = $('#'+targetId);
        this.hovered.addClass('over').id = targetId;
    },

    out : function (event) {
        if (this.hovered)
            this.hovered.removeClass('over');
    },

    toggleActive : function(elem) { 
        this.activeBtn.removeClass('selected');
        this.activeBtn = $('#'+elem.id);
        this.activeBtn.addClass('selected').removeClass('over').id = elem.id;
    },

    showConsole : function(event) {
        this.toggleActive(event.target);
        this.activeView.fadeToggle(500, function() {
            this.activeView = this.console.fadeToggle();
        }.bind(this));
    },

    showProxy: function(event) {
        this.toggleActive(event.target);
        this.activeView.fadeToggle(500, function() {
            this.activeView = this.connections.fadeToggle();
        }.bind(this));
    }
});
