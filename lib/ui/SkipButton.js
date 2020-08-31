'use strict';

function on(video, event, handler) {
    return video.addEventListener(event, handler, false);
}

function timestampToSeconds(timestamp) {
    var parts = (timestamp || '').match(/^(\d\d):(\d\d):(\d\d)$/);

    return parts && parts.slice(1, 4).map(parseFloat).reduce(function (seconds, time, index) {
        var multiplier = Math.pow(60, Math.abs(index - 2));

        return seconds + (time * multiplier);
    }, 0);
}

function calcSkipOffsetSecs(skipoffsetStr, duration) {
    if (!skipoffsetStr) {
        return null;
    }
    if (skipoffsetStr.endsWith('%')) {
        var percent = parseInt(skipoffsetStr);
        return duration * percent / 100.0;
    }
    if (skipoffsetStr.indexOf(':') > 0) {
        return timestampToSeconds(skipoffsetStr);
    }
    return null;
}

function SkipButton(slot, videoSlot, skipoffset, onSkippable, onSkip) {
    this.slot = slot;
    this.videoSlot = videoSlot;
    this.skipoffsetSecs = calcSkipOffsetSecs(skipoffset, videoSlot.duration);
    this.createSkipButton();
    this.onSkippable = onSkippable;
    this.onSkip = onSkip;
    on(videoSlot, 'timeupdate', function ontimeupdate() {
        this.updateSkipButtonState();
    }.bind(this));
}

SkipButton.prototype = {
    createSkipButton: function createSkipButton() {
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
        button.innerHTML = 'Skip ad';
        this.slot.appendChild(button);
        this.button = button;
    },

    updateSkipButtonState: function updateSkipButton() {
        if (this.skipoffsetSecs && this.button) {
            if (this.videoSlot.currentTime > this.skipoffsetSecs) {
                if (!this.button.classList.contains('skip-button-active')) {
                    this.button.classList.add('skip-button-active');
                    this.button.innerHTML = 'Skip ad';
                    this.button.style.cursor = 'pointer';
                    this.button.onclick = function (e) {
                        e.stopPropagation();
                        this.onSkip.apply();
                    }.bind(this);
                    this.onSkippable.apply();
                }
            } else {
                this.button.innerHTML = 'Skip in ' + Math.round(this.skipoffsetSecs - this.videoSlot.currentTime);
            }
        }
    },

    getAdSkippableState: function () {
        return this.videoSlot.currentTime >= this.skipoffsetSecs;
    }

};

module.exports = SkipButton;
