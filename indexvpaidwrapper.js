'use strict';

var VPAIDWrapper = require('./lib/VPAIDWrapper');
window.getVPAIDAd = function(){
    return new VPAIDWrapper();
};
