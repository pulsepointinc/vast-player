'use strict';
var load = require('load-script');

var ScriptLoader = function (slot, scripts) {
    this.funcs = [];
    if (!scripts) {
        return;
    }
    scripts.forEach(function loadScript(scriptDef) {
        var url = scriptDef.url;
        var initFunc = scriptDef.init_function;
        var params = scriptDef.params;
        load(url,null, function scriptLoaded(err) {
            if (err) {
                console.log('Error loading script ' + url);
            }
            try {
                var Func = eval(initFunc);
                if (Func) {
                    this.funcs.push(new Func(slot, params));
                    console.log('Successfully initialized custom script');
                }
            } catch (e) {
                console.log('Error initializing script ' + url);
            }
        }.bind(this));
        console.log('Successfully appended custom script');
    }.bind(this));
};

ScriptLoader.prototype = {
    shutdown: function () {
        if (this.funcs) {
            this.funcs.forEach(function (func) {
                if (func.shutdown) {
                    try {
                        func.shutdown();
                        console.log('Successfully shut down custom script');
                    } catch (e) {
                    }
                }
            });
            this.funcs = [];
        }
    }
};


module.exports = ScriptLoader;
