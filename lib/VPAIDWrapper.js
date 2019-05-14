/*jslint devel: true */

'use strict';

var VASTPlayer = require('./VASTPlayer');
var VPAID_EVENTS = require('./enums/VPAID_EVENTS');
var Sentry = require('@sentry/browser');
var ScriptLoader = require('./util/ScriptLoader');

function proxyMethod(method, swallowError) {
    return function callMethod() {
        var player = this.player_;
        if (!player) {
            this.log_('Did not call method ' + method + ' because player is not ready yet');
            return;
        }
        this.log_(method);
        try {
            player[method].apply(player, arguments).catch(function (e) {
                this.logError_(e);
                if (!swallowError) {
                    this.callEvent_(VPAID_EVENTS.AdError, e);
                }
            }.bind(this));
        } catch (e) {
            this.logError_(e);
            if (!swallowError) {
                this.callEvent_(VPAID_EVENTS.AdError, e);
            }
        }
    };
}

function proxyGetter(prop, defaultValue, swallowError) {
    return function callMethod() {
        var player = this.player_;
        if (!player) {
            this.log_('Did not get property ' + prop + ' because player is not ready yet');
            return defaultValue;
        }

        this.log_('get' + prop);
        try {
            return player[prop];
        } catch (e) {
            this.logError_(e);
            if (!swallowError) {
                this.callEvent_(VPAID_EVENTS.AdError, e);
            }
            return defaultValue;
        }
    };
}

var VPAIDWrapper = function () {
    this.slot_ = null;
    this.videoSlot_ = null;
    this.eventsCallbacks_ = {};
};

VPAIDWrapper.prototype = {
    handshakeVersion: function () {
        return ('2.0');
    },

    initAd: function (width, height, viewMode, desiredBitrate, creativeData, environmentVars) {
        try {
            this.log_('initAd: width: ' + width + ', height: ' + height + ', viewMode: ' + viewMode +
                ', desiredBitrate: ' + desiredBitrate + ', adparameters: ' + JSON.stringify(creativeData.AdParameters) +
                ', videoSlotCanAutoPlay: ' + environmentVars.videoSlotCanAutoPlay);

            // slot and videoSlot are passed as part of the environmentVars
            this.slot_ = environmentVars.slot;
            this.videoSlot_ = environmentVars.videoSlot;
            this.videoSlotCanAutoPlay_ = environmentVars.videoSlotCanAutoPlay || true;

            // Parse the incoming ad parameters.
            var parameters = JSON.parse(creativeData.AdParameters);
            var uri = parameters.vastEndpoints[0];
            if (parameters.sentrydsn) {
                Sentry.init({dsn: parameters.sentrydsn, debug: true, whitelistUrls: ['.*contextweb.*']});
            }

            Sentry.configureScope(function (scope) {
                scope.setExtra('vasturl', uri);
                scope.setExtra('width', width);
                scope.setExtra('height', height);
                scope.setExtra('viewMode', viewMode);
            });

            this.scriptLoader = new ScriptLoader(this.slot_, parameters.scripts);

            var player = new VASTPlayer(this.slot_, this.videoSlot_, {}, this.videoSlotCanAutoPlay_);
            player.vpaidSWFLocation = parameters.vpaidSWFLocation;
            var cleanupFunc = function () {
                this.cleanup_();
            }.bind(this);
            player.on('error', function (e) {
                cleanupFunc();
                this.logAndFireError_(e);
            }.bind(this));
            player.load(uri)
            .then(function () {
                this.player_ = player;
                this.player_.on(VPAID_EVENTS.AdStopped, cleanupFunc);
                this.player_.on(VPAID_EVENTS.AdSkipped, cleanupFunc);
                this.player_.on(VPAID_EVENTS.AdVideoComplete, cleanupFunc);
                this.player_.on(VPAID_EVENTS.AdUserClose, cleanupFunc);
                this.player_.on(VPAID_EVENTS.AdError, cleanupFunc);

                VPAID_EVENTS.forEach(function (event) {
                    if (event !== VPAID_EVENTS.AdLoaded) {
                        this.player_.on(event, function () {
                            this.callEvent_(event);
                        }.bind(this));
                    }
                }.bind(this));

                this.callEvent_(VPAID_EVENTS.AdLoaded);
            }.bind(this))
            .catch(function (reason) {
                this.logAndFireError_(reason);
            }.bind(this));
        } catch (e) {
            this.logAndFireError_(e);
        }
    },

    subscribe: function (aCallback, eventName, aContext) {
        try {
            this.log_('Subscribe ' + eventName);
            var callBack = aContext ? aCallback.bind(aContext) : aCallback;
            this.eventsCallbacks_[eventName] = callBack;
        } catch (e) {
            this.logAndFireError_(e);
        }
    },

    unsubscribe: function (eventName) {
        try {
            this.log_('unsubscribe ' + eventName);
            this.eventsCallbacks_[eventName] = null;
        } catch (e) {
            this.logAndFireError_(e);
        }
    },

    callEvent_: function (eventType, param) {
        this.log_('firing event ' + eventType);

        try {
            if (this.eventsCallbacks_[eventType]) {
                if (param) {
                    this.eventsCallbacks_[eventType](param);
                } else {
                    this.eventsCallbacks_[eventType]();
                }
            }
        } catch (e) {
            this.logError_(e);
        }
    },

    setAdVolume: function (value) {
        this.log_('setAdVolume ' + value);
        try {
            if (!this.player_) {
                this.log_('Did not call method setAdVolume because player is not ready yet');
                return;
            }

            this.player_.adVolume = value;
        } catch (e) {
            this.logError_(e);
        }
    },

    log_: function (message) {
        console.log('PPIMAVPAID:' + message);
    },

    logError_: function (e) {
        console.error(e);
        Sentry.captureException(e);
    },

    logAndFireError_: function (err) {
        this.logError_(err);
        this.cleanup_();
        this.callEvent_(VPAID_EVENTS.AdError, err);
    },

    cleanup_: function cleanup() {
        if (this.scriptLoader) {
            this.scriptLoader.shutdown();
        }
    },

    startAd: proxyMethod('startAd', false),
    stopAd: proxyMethod('stopAd', false),
    resizeAd: proxyMethod('resizeAd', false),
    pauseAd: proxyMethod('pauseAd', false),
    resumeAd: proxyMethod('resumeAd', false),
    expandAd: proxyMethod('expandAd', true),
    collapseAd: proxyMethod('collapseAd', true),
    skipAd: proxyMethod('skipAd', true),

    getAdLinear: proxyGetter('adLinear', true, true),
    getAdWidth: proxyGetter('adWidth', 640, true),
    getAdHeight: proxyGetter('adHeight', 480, true),
    getAdExpanded: proxyGetter('adExpanded', false, true),
    getAdSkippableState: proxyGetter('adSkippableState', false, true),
    getAdRemainingTime: proxyGetter('adRemainingTime', null, false),
    getAdDuration: proxyGetter('adDuration', null, false),
    getAdVolume: proxyGetter('adVolume', 1.0, true),
    getAdCompanions: proxyGetter('adCompanions', '', true),
    getAdIcons: proxyGetter('adIcons', '', true)
};

module.exports = VPAIDWrapper;
