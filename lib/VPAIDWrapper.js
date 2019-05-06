/*jslint devel: true */

'use strict';

var VASTPlayer = require('./VASTPlayer');
var VPAID_EVENTS = require('./enums/VPAID_EVENTS');

var VPAIDWrapper = function () {
    this.slot_ = null;
    this.videoSlot_ = null;
    this.parameters_ = {};
    this.width_ = null;
    this.height_ = null;
    this.viewMode_ = null;
    this.desiredBitrate_ = null;
    this.eventsCallbacks_ = {};
};

VPAIDWrapper.prototype = {
    /**
     * Returns the supported VPAID verion.
     * @param {string} version
     * @return {string}
     */
    handshakeVersion: function () {
        return ('2.0');
    },

    /**
     * Initializes all attributes in the ad. The ad will not start until startAd is\
     * called.
     *
     * @param {number} width The ad width.
     * @param {number} height The ad height.
     * @param {string} viewMode The ad view mode.
     * @param {number} desiredBitrate The desired bitrate.
     * @param {Object} creativeData Data associated with the creative.
     * @param {Object} environmentVars Runtime variables associated with the
     *     creative like the slot and video slot.
     */
    initAd: function (width, height, viewMode, desiredBitrate, creativeData, environmentVars) {
        try {
            this.log_('initAd: width: ' + width + ', height: ' + height + ', viewMode: ' + viewMode +
                ', desiredBitrate: ' + desiredBitrate + ', adparameters: ' + JSON.stringify(creativeData.AdParameters) +
                ', videoSlotCanAutoPlay: ' + environmentVars.videoSlotCanAutoPlay);

            this.width_ = width;
            this.height_ = height;
            this.viewMode_ = viewMode || 'normal';
            this.desiredBitrate_ = desiredBitrate;

            // slot and videoSlot are passed as part of the environmentVars
            this.slot_ = environmentVars.slot;
            this.videoSlot_ = environmentVars.videoSlot;
            this.videoSlotCanAutoPlay_ = environmentVars.videoSlotCanAutoPlay || true;

            // Parse the incoming ad parameters.
            this.parameters_ = JSON.parse(creativeData.AdParameters);
            var uri = this.parameters_.vasturi;

            this.player_ = new VASTPlayer(this.slot_, this.videoSlot_, {}, this.videoSlotCanAutoPlay_);
            VPAID_EVENTS.forEach(function (event) {
                if (event !== VPAID_EVENTS.AdLoaded) {
                    this.player_.on(event, function () {
                        this.callEvent_(event);
                    }.bind(this));
                }
            }.bind(this));
            this.player_.on('error', function (e) {
                this.handleError_(e);
            }.bind(this));
            this.player_.load(uri)
                .then(function () {
                    this.callEvent_(VPAID_EVENTS.AdLoaded);
                }.bind(this))
                .catch(function (reason) {
                    this.handleError_(reason);
                }.bind(this));
        } catch (e) {
            this.handleError_(e);
        }
    },

    /**
     * Called by the wrapper to start the ad.
     */
    startAd: function () {
        try {
            this.log_('Starting ad');
            this.player_.startAd()
                .catch(function (reason) {
                    this.handleError_(reason);
                }.bind(this));
        } catch (e) {
            this.handleError_(e);
        }
    },

    /**
     * Called by the wrapper to stop the ad.
     */
    stopAd: function () {
        this.log_('Stopping ad');
        try {
            this.player_.stopAd()
                .catch(function (reason) {
                    this.handleError_(reason);
                }.bind(this));
        } catch (e) {
            this.handleError_(e);
        }
    },

    /**
     * Called when the video player changes the width/height of the container.
     *
     * @param {number} width The new width.
     * @param {number} height A new height.
     * @param {string} viewMode A new view mode.
     */
    resizeAd: function (width, height, viewMode) {
        try {
            this.log_('resizeAd ' + width + 'x' + height + ' ' + viewMode);
            this.width_ = width;
            this.height_ = height;
            this.viewMode_ = viewMode ? viewMode : 'normal';
        } catch (e) {
            this.logError_(e);
        }
    },

    /**
     * Pauses the ad.
     */
    pauseAd: function () {
        try {
            this.log_('pauseAd');
            this.player_.pauseAd()
                .catch(function (reason) {
                    this.handleError_(reason);
                }.bind(this));
        } catch (e) {
            this.logError_(e);
        }
    },

    /**
     * Resumes the ad.
     */
    resumeAd: function () {
        try {
            this.log_('resumeAd');
            this.player_.resumeAd()
                .catch(function (reason) {
                    this.handleError_(reason);
                }.bind(this));
        } catch (e) {
            this.logError_(e);
        }
    },

    /**
     * Expands the ad.
     */
    expandAd: function () {
        this.log_('expandAd');
        this.player_.expandAd().catch(function (e) {
            this.logError_(e);
        }.bind(this));
    },

    /**
     * Collapses the ad.
     */
    collapseAd: function () {
        this.log_('collapseAd');
        this.player_.collapseAd().catch(function (e) {
            this.logError_(e);
        }.bind(this));
    },

    /**
     * Skips the ad.
     */
    skipAd: function () {
        try {
            this.log_('skipAd');
            this.player_.stopAd()
                .catch(function (reason) {
                    this.handleError_(reason);
                }.bind(this));
        } catch (e) {
            this.handleError_(e);
        }
    },

    /**
     * Registers a callback for an event.
     *
     * @param {Function} aCallback The callback function.
     * @param {string} eventName The callback type.
     * @param {Object} aContext The context for the callback.
     */
    subscribe: function (aCallback, eventName, aContext) {
        try {
            this.log_('Subscribe ' + eventName);
            var callBack = aContext ? aCallback.bind(aContext) : aCallback;
            this.eventsCallbacks_[eventName] = callBack;
        } catch (e) {
            this.handleError_(e);
        }
    },

    /**
     * Removes a callback based on the eventName.
     *
     * @param {string} eventName The callback type.
     */
    unsubscribe: function (eventName) {
        try {
            this.log_('unsubscribe ' + eventName);
            this.eventsCallbacks_[eventName] = null;
        } catch (e) {
            this.handleError_(e);
        }
    },

    callEvent_: function (eventType, param) {
        this.log_('firing event ' + eventType);

        if (this.eventsCallbacks_[eventType]) {
            if (param) {
                this.eventsCallbacks_[eventType](param);
            } else {
                this.eventsCallbacks_[eventType]();
            }
        }
    },
/////////////////// GETTERS //////////////////////////
    /**
     * Returns whether the ad is linear.
     *
     * @return {boolean} True if the ad is a linear, false for non linear.
     */
    getAdLinear: function () {
        this.log_('getAdLinear');
        return this.player_.adLinear;
    },

    /**
     * Returns ad width.
     *
     * @return {number} The ad width.
     */
    getAdWidth: function () {
        this.log_('getAdWidth');

        return this.player_.adWidth;
    },

    /**
     * Returns ad height.
     *
     * @return {number} The ad height.
     */
    getAdHeight: function () {
        this.log_('getAdHeight');

        return this.player_.adHeight;
    },

    /**
     * Returns true if the ad is expanded.
     *
     * @return {boolean}
     */
    getAdExpanded: function () {
        this.log_('getAdExpanded');
        return this.player_.adExpanded;
    },

    /**
     * Returns the skippable state of the ad.
     *
     * @return {boolean}
     */
    getAdSkippableState: function () {
        this.log_('getAdSkippableState');
        return this.player_.adSkippableState;
    },

    /**
     * Returns the remaining ad time, in seconds.
     *
     * @return {number} The time remaining in the ad.
     */
    getAdRemainingTime: function () {
        this.log_('getAdRemainingTime ');
        try {
            return this.player_.adRemainingTime;
        } catch (e) {
            this.logError_(e);
            return 10;
        }
    },

    /**
     * Returns the duration of the ad, in seconds.
     *
     * @return {number} The duration of the ad.
     */
    getAdDuration: function () {
        try {
            this.log_('getAdDuration ');
            return this.player_.adDuration;
        } catch (e) {
            this.logError_(e);
            return 60;
        }
    },

    /**
     * Returns the ad volume.
     *
     * @return {number} The volume of the ad.
     */
    getAdVolume: function () {
        this.log_('getAdVolume');
        try {
            return this.player_.adVolume;
        } catch (e) {
            this.logError_(e);
            return 1;
        }
    },

    /**
     * Returns a list of companion ads for the ad.
     *
     * @return {string} List of companions in VAST XML.
     */
    getAdCompanions: function () {
        this.log_('getAdCompanions ');
        return this.player_.adCompanions;
        return "";
    },

    /**
     * Returns a list of icons.
     *
     * @return {string} A list of icons.
     */
    getAdIcons: function () {
        this.log_('getAdIcons ');
        return this.player_.adIcons;
    },

    /**
     * Sets the ad volume.
     *
     * @param {number} value The volume in percentage.
     */
    setAdVolume: function (value) {
        this.log_('setAdVolume ' + value);
        try {
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
    },

    handleError_: function (err) {
        this.logError_(err);
        this.callEvent_(VPAID_EVENTS.AdError, err);
    }
};

module.exports = VPAIDWrapper;
