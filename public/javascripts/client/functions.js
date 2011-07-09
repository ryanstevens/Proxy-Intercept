
if ( !Function.prototype.bind ) {

  Function.prototype.bind = function( obj ) {
    var slice = [].slice,
        args = slice.call(arguments, 1),
        self = this,
        nop = function () {},
        bound = function () {
          return self.apply( this instanceof nop ? this : ( obj || {} ),
                              args.concat( slice.call(arguments) ) );
        };

    nop.prototype = self.prototype;

    bound.prototype = new nop();

    return bound;
  };
}

_.convertObjToArr = function(obj) {

    var arr = [];
    _.each(_.keys(obj), function(key) {
        arr.push({ key : key, value : obj[key]});
    });
    return arr;

};

var tempId = 0;
_.reIdArr = function(arr) {
    _.each(arr, function(elem) {
        elem.id = '_temp_'+tempId++;
    });
    return arr;
};

var CommandCollection = function(options) {

    this.options = options || {};
    this.active = $('#'+this.options.commands[0].id);
    this.active.id = this.options.commands[0].id;
    var self = this;

    this.over = function(elem) {
        var targetId = elem.id;
        if (this.active.id === targetId) return;
        this.hovered = $('#'+targetId);
        this.hovered.addClass(this.options.hovorClass).id = targetId;
    };

    this.out = function(elem) {
        if (this.hovered) this.hovered.removeClass(this.options.hovorClass);
    };

    this.toggleActive=function(elem) {
        if (elem.id === this.active.id)
            return;
        this.active.removeClass(this.options.activeClass);
        this.active = $('#'+elem.id);
        this.active.addClass(this.options.activeClass).removeClass(this.options.hovorClass).id = elem.id;
        this.options.callback(elem);
    };
        
    _.each(this.options.commands, function(cmd) {
        $(cmd).bind('mouseenter', function() {
            self.over(cmd);
        }).bind('mouseleave', function() {
            self.out(cmd);
        }).bind('click', function() {
            self.toggleActive(cmd);
        });
    });


};
_.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
};

function escapeHTML(string) {
    return string.replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

