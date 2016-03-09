'use strict';

module.exports = function(grunt) {

    grunt.initConfig({
        concat: {
            dist: {
                src: ['src/*.js'],
                dest: 'dist/sparql-service.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('build', ['concat:dist']);
};
