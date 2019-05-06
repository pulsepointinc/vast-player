'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var LiePromise = require('lie');
var canPlay = require('../environment').canPlay;
var sortBy = require('sort-by');
var VPAID_EVENTS = require('../enums/VPAID_EVENTS');
var HTML_MEDIA_EVENTS = require('../enums/HTML_MEDIA_EVENTS');
var HTMLVideoTracker = require('../HTMLVideoTracker');
var EventProxy = require('../EventProxy');

function on(video, event, handler) {
    return video.addEventListener(event, handler, false);
}

function off(video, event, handler) {
    return video.removeEventListener(event, handler, false);
}

function once(video, event, handler) {
    return on(video, event, function onevent() {
        off(video, event, onevent);
        return handler.apply(this, arguments);
    });
}

function method(implementation, promiseify) {
    function getError() {
        return new Error('The <video> has not been loaded.');
    }

    return function callImplementation(/*...args*/) {
        if (!this.loadedMetadata) {
            if (promiseify) { return LiePromise.reject(getError()); } else { throw getError(); }
        }

        return implementation.apply(this, arguments);
    };
}

function pickMediaFile(mediaFiles, dimensions) {
    var width = dimensions.width;
    var items = mediaFiles.map(function(mediaFile) {
        return {
            mediaFile: mediaFile,
            playability: canPlay(mediaFile.type)
        };
    }).filter(function(config) {
        return config.playability > 0;
    }).sort(sortBy('-playability', '-mediaFile.bitrate'));
    var distances = items.map(function(item) {
        return Math.abs(width - item.mediaFile.width);
    });
    var item = items[distances.indexOf(Math.min.apply(Math, distances))];

    return (!item || item.playability < 1) ? null : item.mediaFile;
}

function HTMLVideo(slot, videoSlot, skipoffset) {
    this.slot = slot;
    this.videoSlot = videoSlot;
    this.loadedMetadata = false;
    this.skipoffset = skipoffset;

    this.__private__ = {
        hasPlayed: false
    };
}
inherits(HTMLVideo, EventEmitter);
Object.defineProperties(HTMLVideo.prototype, {
    adRemainingTime: { get: method(function getAdRemainingTime() {
        return this.videoSlot.duration - this.videoSlot.currentTime;
    }) },
    adDuration: { get: method(function getAdDuration() { return this.videoSlot.duration; }) },
    adVolume: {
        get: method(function getAdVolume() { return this.videoSlot.volume; }),
        set: method(function setAdVolume(volume) { this.videoSlot.volume = volume; })
    },
    adExpanded: {get: function getAdExpanded() {return false;}},
    adLinear: { get: function getAdLinear() { return true; }},
    adWidth: { get:  method(function getAdWidth() { return this.slot.offsetWidth;})},
    adHeight: { get:  method(function getAdHeight() { return this.slot.offsetHeight; })},
    adSkippableState: { get: method(function getAdHeight() {
        if (!this.skipoffset) {
            return false;
        }
        return this.videoSlot.currentTime >= this.skipoffset;
    }) },
    adCompanions: { get: function getAdCompanions() { return ''; } },
    adIcons: { get: function getAdIcons() { return ''; } }
});

HTMLVideo.prototype.load = function load(mediaFiles) {
    var self = this;

    return new LiePromise(function loadCreative(resolve, reject) {
        var video = self.videoSlot;
        var mediaFile = pickMediaFile(mediaFiles, self.slot.getBoundingClientRect());

        if (!mediaFile) {
            return reject(new Error('There are no playable <MediaFile>s.'));
        }

        once(video, HTML_MEDIA_EVENTS.LOADEDMETADATA, function onloadedmetadata() {
            var tracker = new HTMLVideoTracker(video);
            var proxy = new EventProxy(VPAID_EVENTS);

            proxy.from(tracker).to(self);

            self.loadedMetadata = true;
            resolve(self);

            self.emit(VPAID_EVENTS.AdLoaded);

            on(video, HTML_MEDIA_EVENTS.DURATIONCHANGE, function ondurationchange() {
                self.emit(VPAID_EVENTS.AdDurationChange);
            });
            on(video, HTML_MEDIA_EVENTS.VOLUMECHANGE, function onvolumechange() {
                self.emit(VPAID_EVENTS.AdVolumeChange);
            });
        });

        once(video, HTML_MEDIA_EVENTS.ERROR, function onerror() {
            var error = video.error;

            self.emit(VPAID_EVENTS.AdError, error ? error.message : "Unknown HTML5 video error");
            reject(error);
        });

        once(video, HTML_MEDIA_EVENTS.PLAYING, function onplaying() {
            self.__private__.hasPlayed = true;
            self.emit(VPAID_EVENTS.AdImpression);
        });

        once(video, HTML_MEDIA_EVENTS.ENDED, function onended() {
            self.stopAd();
        });

        on(video, 'click', function onclick() {
            self.emit(VPAID_EVENTS.AdClickThru, null, null, true);
        });
        on(self.slot, 'click', function onclick() {
            self.emit(VPAID_EVENTS.AdClickThru, null, null, true);
        });

        video.setAttribute('type', mediaFile.type);
        video.setAttribute('src', mediaFile.uri);
        video.load();
    });
};

HTMLVideo.prototype.startAd = method(function startAd() {
    var self = this;
    var video = this.videoSlot;

    if (this.__private__.hasPlayed) {
        return LiePromise.reject(new Error('The ad has already been started.'));
    }

    return new LiePromise(function callPlay(resolve) {
        once(video, HTML_MEDIA_EVENTS.PLAYING, function onplaying() {
            resolve(self);
            self.emit(VPAID_EVENTS.AdStarted);
            if (self.skipoffset) {
                self.createSkipButton();
                on(self.videoSlot, 'timeupdate', function ontimeupdate() {
                    self.updateSkipButtonState();
                });
            }

        });

        return video.play();
    });
}, true);

HTMLVideo.prototype.createSkipButton = function createSkipButton() {
    var button = document.createElement('div');
    button.style.display = 'block';
    button.style.position = 'absolute';
    button.style.bottom = '20%';
    button.style.right = '0';
    button.style['background-color'] = '#000';
    button.style.color = 'white';
    button.style['font-size'] = '15px';
    button.style['font-weight'] = 'bold';
    button.style.width = 'auto';
    button.style.padding = '8px';
    button.style['z-index'] = '2';
    button.style.border = '1px solid white';
    button.style['border-right'] = 'none';
    button.innerHTML = '';
    this.slot.appendChild(button);
    this.skipButton = button;
};

HTMLVideo.prototype.updateSkipButtonState = function updateSkipButton() {
    if (this.skipoffset && this.skipButton) {
        if (this.videoSlot.currentTime > this.skipoffset) {
            if (!('skip-button-active' in this.skipButton.classList)) {
                this.skipButton.innerHTML = 'Skip ad';
                this.skipButton.style.cursor = 'pointer';
                this.skipButton.classList.add('skip-button-active');
                this.skipButton.onclick = function () {
                    this.skipAd();
                }.bind(this);
                this.emit(VPAID_EVENTS.AdSkippableStateChange);
            }
        } else {
            this.skipButton.innerHTML = 'Skip in ' + Math.round(this.skipoffset - this.videoSlot.currentTime);
        }
    }
};

HTMLVideo.prototype.stopAd = method(function stopAd() {
    this.videoSlot.setAttribute('src', '');
    this.emit(VPAID_EVENTS.AdStopped);

    return LiePromise.resolve(this);
}, true);

HTMLVideo.prototype.pauseAd = method(function pauseAd() {
    var self = this;
    var video = this.videoSlot;

    if (this.videoSlot.paused) {
        self.emit(VPAID_EVENTS.AdPaused);
        return LiePromise.resolve(this);
    }

    return new LiePromise(function callPause(resolve) {
        once(video, HTML_MEDIA_EVENTS.PAUSE, function onpause() {
            resolve(self);
            self.emit(VPAID_EVENTS.AdPaused);
        });

        return video.pause();
    });
}, true);

HTMLVideo.prototype.resumeAd = method(function resumeAd() {
    var self = this;
    var video = this.videoSlot;

    if (!this.__private__.hasPlayed) {
        return LiePromise.reject(new Error('The ad has not been started yet.'));
    }

    if (!this.videoSlot.paused) {
        return LiePromise.resolve(this);
    }

    return new LiePromise(function callPlay(resolve) {
        once(video, HTML_MEDIA_EVENTS.PLAY, function onplay() {
            resolve(self);
            self.emit(VPAID_EVENTS.AdPlaying);
        });

        return video.play();
    });
}, true);

HTMLVideo.prototype.expandAd = method(function expandAd() {
    return LiePromise.resolve(this); //do nothing
});

HTMLVideo.prototype.collapseAd = method(function collapseAd() {
    return LiePromise.resolve(this); //do nothing
});

HTMLVideo.prototype.resizeAd = method(function resizeAd(width, height) {
    this.videoSlot.setAttribute('width', width);
    this.videoSlot.setAttribute('height', height);
    this.slot.setAttribute('width', width);
    this.slot.setAttribute('height', height);

    this.emit(VPAID_EVENTS.AdSizeChange);
    return LiePromise.resolve(this);
});

HTMLVideo.prototype.skipAd = method(function skipAd() {
    this.videoSlot.setAttribute('src', '');
    this.emit(VPAID_EVENTS.AdSkipped);

    return LiePromise.resolve(this); //do nothing
});



module.exports = HTMLVideo;
