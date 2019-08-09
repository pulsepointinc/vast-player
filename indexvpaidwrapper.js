'use strict';

require('core-js/features/promise');
require('core-js/es/object/assign');
require('core-js/es/string/includes');
require('core-js/es/number/is-nan');
require('core-js/es/array/filter');
require('core-js/es/array/map');
var VPAIDWrapper = require('./lib/VPAIDWrapper');

window.getVPAIDAd = function(){
    return new VPAIDWrapper();
};
