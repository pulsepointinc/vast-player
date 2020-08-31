'use strict';

var TESTS = ['test/spec/**/*.ut.js'];
var LIBS = [
    'lib/**/*.js',
    'index.js'
];
var CODE = LIBS.concat(TESTS);

module.exports = function gruntfile(grunt) {
    var pkg = require('./package.json');
    var npmTasks = Object.keys(pkg.devDependencies).filter(function(name) {
        return (name !== 'grunt-cli') && (/^grunt-/).test(name);
    });

    npmTasks.forEach(function(name) {
        grunt.task.loadNpmTasks(name);
    });
    grunt.task.loadTasks('./tasks');

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: true
            },
            code: {
                src: CODE
            }
        },
        karma: {
            options: {
                configFile: 'test/karma.conf.js'
            },
            tdd: {
                options: {
                    autoWatch: true
                }
            },
            test: {
                options: {
                    singleRun: true
                }
            }
        },

        clean: {
            build: ['dist'],
            server: ['examples/.build']
        },
        browserify: {
            options: {
                browserifyOptions: {
                    standalone: 'VASTPlayer'
                }
            },

            build: {
                files: [
                    {
                        src: 'index.js',
                        dest: 'dist/vast-player.js'
                    },
                    {
                        src: 'indexvpaidwrapper.js',
                        dest: 'dist/vpaid-wrapper.js'
                    }
                ]
            },
            server: {
                options: {
                    watch: true
                },
                files: [
                    {
                        src: 'index.js',
                        dest: 'examples/.build/vast-player.js'
                    }
                ]
            }
        },
        uglify: {
            build: {
                options: {
                    screwIE8: true
                },
                files: [
                    {
                        expand: true,
                        cwd: 'dist',
                        src: '*.js',
                        dest: 'dist/',
                        ext: '.min.js',
                        extDot: 'last'
                    }
                ]
            }
        },
        mxmlc: {
            options: {
                rawConfig: '-compiler.source-path=./lib/as3/src'
            },

            build: {
                files: [
                    {
                        src: 'lib/as3/src/com/reelcontent/vpaidadapter/main/Player.as',
                        dest: 'dist/vast-player--vpaid.swf'
                    }
                ]
            },
            server: {
                files: [
                    {
                        src: 'lib/as3/src/com/reelcontent/vpaidadapter/main/Player.as',
                        dest: 'examples/.build/vast-player--vpaid.swf'
                    }
                ]
            }
        },

        connect: {
            server: {
                options: {
                    base: 'examples',
                    livereload: true,
                    open: true
                }
            }
        },
        watch: {
            server: {
                options: {
                    livereload: true
                },
                files: [
                    'examples/**',
                    'lib/as3/**'
                ],
                tasks: ['mxmlc:server']
            }
        }
    });

    grunt.registerTask('test', [
        'karma:test',
        'jshint:code'
    ]);

    grunt.registerTask('build', [
        'clean:build',
        'browserify:build',
        'uglify:build',
        'mxmlc:build'
    ]);

    grunt.registerTask('server', [
        'browserify:server',
        'mxmlc:server',
        'connect:server',
        'watch:server'
    ]);

    grunt.registerTask('tdd', ['karma:tdd']);
};
