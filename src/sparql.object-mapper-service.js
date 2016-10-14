(function() {
    'use strict';

    /* eslint-disable angular/no-service-method */

    /**
    * @ngdoc service
    * @name sparql.objectMapperService
    * @description
    * # objectMapperService
    * Service for transforming SPARQL results into more manageable objects.
    *
    * The service can be extended via prototype inheritance by re-implementing
    * any of the methods. The most likely candidates for re-implementation are
    * `makeObject`, `reviseObject`, and `postProcess`.
    *
    * The methods for using the service are `makeObjectList`, and `makeObjectListNoGrouping`.
    */
    angular.module('sparql')
    .service('objectMapperService', objectMapperService);

    /* ngInject */
    function objectMapperService(_) {
        /* Overridable processing methods */
        ObjectMapper.prototype.makeObject = makeObject;
        ObjectMapper.prototype.reviseObject = reviseObject;
        ObjectMapper.prototype.mergeObjects = mergeObjects;
        ObjectMapper.prototype.postProcess = postProcess;

        /* API methods */
        ObjectMapper.prototype.makeObjectList = makeObjectList;
        ObjectMapper.prototype.makeObjectListNoGrouping = makeObjectListNoGrouping;

        return new ObjectMapper();

        function ObjectMapper() {
            this.objectClass = Object;
        }

        /**
        * @ngdoc method
        * @methodOf sparql.objectMapperService
        * @name sparql.objectMapperService#makeObjectList
        * @param {Array} objects A list of objects as SPARQL results.
        * @returns {Array} The mapped object list.
        * @description
        * Map the SPARQL results as objects, and return a list where result rows with the same
        * id are merged into one object.
        */
        function makeObjectList(objects) {
            var self = this;
            var obj_list = _.transform(objects, function(result, obj) {
                if (!obj.id) {
                    return null;
                }
                var orig = obj;
                obj = self.makeObject(obj);
                obj = self.reviseObject(obj, orig);
                // Check if this object has been constructed earlier
                var old = _.find(result, function(e) {
                    return e.id === obj.id;
                });
                if (old) {
                    // Merge this triple into the object constructed earlier
                    self.mergeObjects(old, obj);
                }
                else {
                    // This is the first triple related to the id
                    result.push(obj);
                }
            });
            return self.postProcess(obj_list);
        }

        /**
        * @ngdoc method
        * @methodOf sparql.objectMapperService
        * @name sparql.objectMapperService#makeObjectListNoGrouping
        * @param {Array} objects A list of objects as SPARQL results.
        * @returns {Array} The mapped object list.
        * @description
        * Maps the SPARQL results as objects, but does not merge any rows.
        */
        function makeObjectListNoGrouping(objects) {
            // Create a list of the SPARQL results where each result row is treated
            // as a separated object.
            var self = this;
            var obj_list = _.transform(objects, function(result, obj) {
                obj = self.makeObject(obj);
                result.push(obj);
            });
            return obj_list;
        }

        /**
        * @ngdoc method
        * @methodOf sparql.objectMapperService
        * @name sparql.objectMapperService#makeObject
        * @param {Object} obj A single SPARQL result row object.
        * @returns {Object} The mapped object.
        * @description
        * Flatten the result object. Discard everything except values.
        * Assume that each property of the obj has a value property with
        * the actual value.
        */
        function makeObject(obj) {
            var o = new this.objectClass();

            _.forIn(obj, function(value, key) {
                // If the variable name contains "__", an object
                // will be created as the value
                // E.g. { place__id: '1' } -> { place: { id: '1' } }
                _.set(o, key.replace(/__/g, '.'), value.value);
            });

            return o;
        }

        /**
        * @ngdoc method
        * @methodOf sparql.objectMapperService
        * @name sparql.objectMapperService#reviseObject
        * @param {Object} obj A single object as returned by {@link sparql.objectMapperService#makeObject makeObject}.
        * @param {Object} original A single SPARQL result row object.
        * @returns {Object} The revised object.
        * @description
        * Provides a hook for revising an object after it has been processed by {@link sparql.objectMapperService#makeObject makeObject}.
        * The defaul implementation is a no-op.
        */
        function reviseObject(obj, original) { // eslint-disable-line no-unused-vars
            // This is called with a reference to the original result objects
            // as the second parameter.
            return obj;
        }

        /**
        * @ngdoc method
        * @methodOf sparql.objectMapperService
        * @name sparql.objectMapperService#mergeObjects
        * @param {Object} first An object as returned by {@link sparql.objectMapperService#makeObject makeObject}.
        * @param {Object} second The object to merge with the first.
        * @returns {Object} The merged object.
        * @description
        * Merges two objects.
        */
        function mergeObjects(first, second) {
            // Merge two objects into one object.
            return _.mergeWith(first, second, function(a, b) {
                if (_.isEqual(a, b)) {
                    return a;
                }
                if (_.isArray(a)) {
                    if (_.isArray(b)) {
                        return  _.uniqWith(a.concat(b), _.isEqual);
                    }
                    if (_.find(a, function(val) { return _.isEqual(val, b); })) {
                        return a;
                    }
                    return a.concat(b);
                }
                if (a && !b) {
                    return a;
                }
                if (b && !a) {
                    return b;
                }
                if (_.isArray(b)) {
                    return b.concat(a);
                }

                return [a, b];
            });
        }

        /**
        * @ngdoc method
        * @methodOf sparql.objectMapperService
        * @name sparql.objectMapperService#postProcess
        * @param {Array} objects A list of mapped objects.
        * @returns {Array} The processed object list.
        * @description
        * Provides a hook for processing the object list after all results have been processed.
        * The defaul implementation is a no-op.
        */
        function postProcess(objects) {
            return objects;
        }
    }
})();
