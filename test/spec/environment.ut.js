'use strict';

var proxyquire = require('proxyquire');

describe('environment', function() {
    var environment;
    var stubs;
    var mockWindow;

    function get() {
        return (environment = proxyquire('../../lib/environment', stubs));
    }

    beforeEach(function() {
        mockWindow = {
            navigator: {
                mimeTypes: {},
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36'
            }
        };

        stubs = {
            './window': mockWindow,

            '@noCallThru': true
        };

        get();
    });

    it('should exist', function() {
        expect(environment).toEqual(jasmine.any(Object));
    });

    it('should be frozen', function() {
        expect(Object.isFrozen(environment)).toBe(true, 'environment is not frozen!');
    });



    describe('Functions', function() {
        describe('canPlay(type)', function() {
            var canPlay;
            var type;

            beforeEach(function() {
                canPlay = environment.canPlay;
            });

            describe('if the type is "video/x-flv"', function() {
                beforeEach(function() {
                    type = 'video/x-flv';
                });

                it('should return 0', function() {
                    expect(canPlay(type)).toBe(0);
                });
            });

            describe('if the type is "application/javascript"', function() {
                beforeEach(function() {
                    type = 'application/javascript';
                });

                it('should return 2', function() {
                    expect(canPlay(type)).toBe(2);
                });
            });

            describe('if the type is "application/x-javascript"', function() {
                beforeEach(function() {
                    type = 'application/x-javascript';
                });

                it('should return 2', function() {
                    expect(canPlay(type)).toBe(2);
                });
            });

            describe('if the type is "application/x-shockwave-flash"', function() {
                beforeEach(function() {
                    type = 'application/x-shockwave-flash';
                });

                describe('in any browser but IE', function() {
                    beforeEach(function() {
                        delete mockWindow.ActiveXObject;
                    });

                    describe('if the browser has no mimeTypes', function() {
                        beforeEach(function() {
                            delete mockWindow.navigator.mimeTypes;
                        });

                        it('should return 0', function() {
                            expect(canPlay(type)).toBe(0);
                        });
                    });

                    describe('if the browser has mimeTypes', function() {
                        beforeEach(function() {
                            mockWindow.navigator.mimeTypes = {};
                        });

                        describe('but the "Shockwave Flash" plugin is undefined', function() {
                            beforeEach(function() {
                                mockWindow.navigator.mimeTypes['application/x-shockwave-flash'] = undefined;
                            });

                            it('should return 0', function() {
                                expect(canPlay(type)).toBe(0);
                            });
                        });

                        describe('and the "Shockwave Flash" is an Object', function() {
                            beforeEach(function() {
                                mockWindow.navigator.mimeTypes['application/x-shockwave-flash'] = {};
                            });

                            it('should return 2', function() {
                                expect(canPlay(type)).toBe(2);
                            });
                        });
                    });
                });

                describe('in IE', function() {
                    beforeEach(function() {
                        delete mockWindow.navigator.mimeTypes;
                        mockWindow.ActiveXObject = jasmine.createSpy('ActiveXObject()');
                    });

                    describe('if the ShockwaveFlash.ShockwaveFlash ActiveXObject() throws an Error', function() {
                        beforeEach(function() {
                            mockWindow.ActiveXObject.and.throwError(new Error('NOT VALID!'));
                        });

                        it('should return 0', function() {
                            expect(canPlay(type)).toBe(0);
                            expect(mockWindow.ActiveXObject).toHaveBeenCalledWith('ShockwaveFlash.ShockwaveFlash');
                        });
                    });

                    [true, {}].forEach(function(value) {
                        describe('if the ShockwaveFlash.ShockwaveFlash is ' + value, function() {
                            beforeEach(function() {
                                mockWindow.ActiveXObject.and.returnValue(value);
                            });

                            it('should return 2', function() {
                                expect(canPlay(type)).toBe(2);
                                expect(mockWindow.ActiveXObject).toHaveBeenCalledWith('ShockwaveFlash.ShockwaveFlash');
                            });
                        });
                    });
                });
            });

            ['video/x-flv', 'video/mp4', 'video/webm', 'video/3gp'].forEach(function(mime) {
                describe('if the type is ' + mime, function() {
                    beforeEach(function() {
                        type = mime;
                    });

                    describe('if the browser supports HTML5 video', function() {
                        var createElement;
                        var video;

                        beforeEach(function() {
                            createElement = document.createElement;
                            spyOn(document, 'createElement').and.callFake(function(tagName) {
                                var element = createElement.apply(document, arguments);

                                if (tagName.toUpperCase() === 'VIDEO') {
                                    element.canPlayType = jasmine.createSpy('HTMLMediaElement.prototype.canPlayType()').and.returnValue('');
                                }

                                return element;
                            });

                            environment = proxyquire('../../lib/environment', stubs);
                            canPlay = environment.canPlay;

                            expect(document.createElement).toHaveBeenCalledWith('video');
                            video = document.createElement.calls.mostRecent().returnValue;
                        });

                        describe('and the browser can\'t play that type', function() {
                            beforeEach(function() {
                                video.canPlayType.and.returnValue('');
                            });

                            it('should return 0', function() {
                                expect(canPlay(type)).toBe(0);
                                expect(video.canPlayType).toHaveBeenCalledWith(type);
                            });
                        });

                        describe('if the browser can maybe play that type', function() {
                            beforeEach(function() {
                                video.canPlayType.and.returnValue('maybe');
                            });

                            it('should return 1', function() {
                                expect(canPlay(type)).toBe(1);
                                expect(video.canPlayType).toHaveBeenCalledWith(type);
                            });
                        });

                        describe('if the browser can probably play that type', function() {
                            beforeEach(function() {
                                video.canPlayType.and.returnValue('probably');
                            });

                            it('should return 2', function() {
                                expect(canPlay(type)).toBe(2);
                                expect(video.canPlayType).toHaveBeenCalledWith(type);
                            });
                        });
                    });

                    describe('if the browser does not support HTML5 video', function() {
                        var createElement;

                        beforeEach(function() {
                            createElement = document.createElement;
                            spyOn(document, 'createElement').and.callFake(function(tagName) {
                                var element = createElement.apply(document, arguments);

                                if (tagName.toUpperCase() === 'VIDEO') {
                                    spyOn(element, 'canPlayType').and.returnValue('hui');
                                }

                                return element;
                            });

                            environment = proxyquire('../../lib/environment', stubs);
                            canPlay = environment.canPlay;

                            expect(document.createElement).toHaveBeenCalledWith('video');
                        });

                        it('should return 0', function() {
                            expect(canPlay(type)).toBe(0);
                        });
                    });
                });
            });
        });
    });
});
