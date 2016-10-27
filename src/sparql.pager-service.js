(function() {

    'use strict';

    /**
    * @ngdoc object
    * @name sparql.PagerService
    */
    angular.module('sparql')
    .factory('PagerService', PagerService);

    /* ngInject */
    function PagerService($q, _) {

        /**
        * @ngdoc function
        * @name sparql.PagerService
        * @constructor
        * @description
        * Service for paging SPARQL results.
        *
        * {@link sparql.AdvancedSparqlService `AdvancedSparqlService`} initializes this service, so manual init is not needed.
        * @param {string} sparqlQry The SPARQL query.
        * @param {string} resultSetQry The result set subquery part of the query - i.e. the part which
        * defines the distinct objects that are being paged
        * (containing `<PAGE>` as a placeholder for SPARQL limit and offset).
        * @param {number} itemsPerPage The size of a single page.
        * @param {function} getResults A function that returns a promise of results given a
        * SPARQL query.
        * @param {number} [pagesPerQuery=1] The number of pages to get per query.
        * @param {number} [itemCount] The total number of items that the sparqlQry returns.
        * Optional, will be queried based on the resultSetQry if not given.
        */
        return function(sparqlQry, resultSetQry, itemsPerPage, getResults, pagesPerQuery, itemCount) {

            var self = this;

            /* Public API */

            // getTotalCount() -> promise
            self.getTotalCount = getTotalCount;
            // getMaxPageNo() -> promise
            self.getMaxPageNo = getMaxPageNo;
            // getPage(pageNumber) -> promise
            self.getPage = getPage;
            // getAllSequentially() -> promise
            self.getAllSequentially = getAllSequentially;

            // How many pages to get with one query.
            self.pagesPerQuery = pagesPerQuery || 1;

            /* Internal vars */

            // The total number of items.
            var count = itemCount || undefined;
            // The number of the last page.
            var maxPage = count ? calculateMaxPage(count, pageSize) : undefined;
            // Cached pages.
            var pages = [];

            var pageSize = itemsPerPage;

            var countQry = countify(resultSetQry.replace('<PAGE>', ''));

            /* Public API function definitions */

            /**
            * @ngdoc method
            * @methodOf sparql.PagerService
            * @name sparql.PagerService#getPage
            * @description
            * Get a specific "page" of data.
            * @param {string} pageNo The number of the page to get (0-indexed).
            * @param {number} [size] The page size. Changes the configured page size.
            *   Using this parameter is not recommended, and may be removed in the future.
            * @returns {promise} A promise of the page of the query results as objects.
            */
            function getPage(pageNo, size) {
                /*
                * TODO: Fix race condition problem when changing the page size (perhaps don't
                *      allow it at all without a new instantiation?)
                */
                // Currently prone to race conditions when using the size
                // parameter to change the page size.

                if (size && size !== pageSize) {
                    // Page size change. Clear page cache.
                    // This part is problematic if the function is called
                    // multiple times in short succession.
                    pageSize = size;
                    pages = [];
                }

                // Get cached page if available.
                if (pages[pageNo]) {
                    return pages[pageNo].promise;
                }
                if (pageNo < 0) {
                    return $q.when([]);
                }
                return getTotalCount().then(function() {
                    if (pageNo > maxPage || !count) {
                        return $q.when([]);
                    }
                    // Get the page window for the query (i.e. query for surrounding
                    // pages as well according to self.pagesPerQuery).
                    var start = getPageWindowStart(pageNo);
                    // Assign a promise to each page within the window as all of those
                    // will be fetched.
                    for (var i = start; i < start + self.pagesPerQuery && i <= maxPage; i++) {
                        if (!pages[i]) {
                            pages[i] = $q.defer();
                        }
                    }
                    // Query for the pages.
                    return getResults(pagify(sparqlQry, start, pageSize, self.pagesPerQuery))
                    .then(function(results) {
                        var chunks = _.chunk(results, pageSize);
                        chunks.forEach(function(page) {
                            // Resolve each page promise.
                            pages[start].resolve(page);
                            start++;
                        });
                        // Return (the promise of) the requested page.
                        return pages[pageNo].promise;
                    });
                });
            }

            /**
            * @ngdoc method
            * @methodOf sparql.PagerService
            * @name sparql.PagerService#getAllSequentially
            * @description
            * Get all results sequentially in chunks.
            * @param {number} chunkSize The amount of results to get per query.
            * @returns {promise} A promise of the query results as objects.
            * The promise will be notified between receiving chunks.
            */
            function getAllSequentially(chunkSize) {
                var all = [];
                var res = $q.defer();
                var chain = $q.when();
                return getTotalCount().then(function(count) {
                    var max = Math.ceil(count / chunkSize);
                    var j = 0;
                    for (var i = 0; i < max; i++) {
                        chain = chain.then(function() {
                            return getResults(pagify(sparqlQry, j++, chunkSize, 1)).then(function(page) {
                                all = all.concat(page);
                                res.notify(all);
                            });
                        });
                    }
                    chain.then(function() {
                        res.resolve(all);
                    });

                    return res.promise;
                });
            }

            /**
            * @ngdoc method
            * @methodOf sparql.PagerService
            * @name sparql.PagerService#getTotalCount
            * @description
            * Get the total count of results.
            * @returns {promise} A promise of total count of the query results.
            */
            function getTotalCount() {
                // Get cached count if available.
                if (count) {
                    maxPage = calculateMaxPage(count, pageSize);
                    return $q.when(count);
                }
                return getResults(countQry, true).then(function(results) {
                    // Cache the count.
                    count = parseInt(results[0].count.value);
                    maxPage = calculateMaxPage(count, pageSize);
                    return count;
                });
            }

            /**
            * @ngdoc method
            * @methodOf sparql.PagerService
            * @name sparql.PagerService#getMaxPageNo
            * @description
            * Get the number of the last page of results.
            * @returns {promise} A promise of the number of the last page.
            */
            function getMaxPageNo() {
                return getTotalCount().then(function(count) {
                    return calculateMaxPage(count, pageSize);
                });
            }

            /* Internal helper functions */

            function pagify(sparqlQry, page, pageSize, pagesPerQuery) {
                // Form the query for the given page.
                var query = sparqlQry.replace('<PAGE>',
                        ' LIMIT ' + pageSize * pagesPerQuery + ' OFFSET ' + (page * pageSize));
                return query;
            }

            function countify(sparqlQry) {
                // Form a query that counts the total number of items returned
                // by the query (by replacing the first SELECT with a COUNT).
                return sparqlQry.replace(/(\bselect\b.+?(where)?\W+?\{)/i,
                    'SELECT (COUNT(DISTINCT ?id) AS ?count) WHERE { $1 ') + ' }';
            }

            function getPageWindowStart(pageNo) {
                // Get the page number of the first page to fetch.

                if (pageNo <= 0) {
                    // First page.
                    return 0;
                }
                if (pageNo >= maxPage) {
                    // Last page -> window ends on last page.
                    return Math.max(pageNo - self.pagesPerQuery + 1, 0);
                }
                var minMin = pageNo < self.pagesPerQuery ? 0 : pageNo - self.pagesPerQuery;
                var maxMax = pageNo + self.pagesPerQuery > maxPage ? maxPage : pageNo + self.pagesPerQuery;
                var min, max;
                for (min = minMin; min <= pageNo; min++) {
                    // Get the lowest non-cached page within the extended window.
                    if (!pages[min]) {
                        break;
                    }
                }
                if (min === pageNo) {
                    // No non-cached pages before the requested page within the extended window.
                    return pageNo;
                }
                for (max = maxMax; max > pageNo; max--) {
                    // Get the highest non-cached page within the extended window.
                    if (!pages[max]) {
                        break;
                    }
                }
                if (minMin === min && maxMax === max) {
                    // No cached pages near the requested page
                    // -> requested page in the center of the window
                    return min + Math.ceil(self.pagesPerQuery / 2);
                }
                if (max < maxMax) {
                    // There are some cached pages toward the end of the extended window
                    // -> window ends at the last non-cached page
                    return Math.max(max - self.pagesPerQuery + 1, 0);
                }
                // Otherwise window starts from the lowest non-cached page
                // within the extended window.
                return min;
            }

            function calculateMaxPage(count, pageSize) {
                return Math.ceil(count / pageSize) - 1;
            }

        };
    }
})();
