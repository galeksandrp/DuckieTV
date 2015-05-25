var HTMLScraper = function(text) {

    var parser = new DOMParser();
    this.doc = parser.parseFromString(result.data, "text/html");

    this.walkSelector = function(selector, callback) {
        return this.walkNodes(this.querySelectorAll(selector), callback);
    };

    this.querySelector = function(selector) {
        return this.doc.querySelector(selector);
    };

    this.querySelectorAll = function(selector) {
        return this.doc.querySelectorAll(selector);
    };

    this.walkNodes = function(nodes, callback) {
        return Array.prototype.map.call(nodes, callback);
    };

    return this;
};

DuckieTV.factory('BaseHTTPApi', ["$http",
    function($http) {

        var BaseHTTPApi = function() {

        };

        BaseHTTPApi.prototype.config = {
            server: null,
            port: null,
            username: null,
            use_auth: null
        };

        BaseHTTPApi.prototype.endpoints = {
            torrents: null,
            portscan: null,
            addmagnet: null
        };



        /**
         * Fetches the url, auto-replaces the port in the url if it was found.
         */
        BaseHTTPApi.prototype.getUrl = function(type, param) {
            var out = this.config.server + ':' + this.config.port + this.endpoints[type];
            return out.replace('://', '://' + this.config.username + ':' + this.config.password + '@').replace('%s', encodeURIComponent(param));
        };

        /**
         * Build a JSON request using the URLBuilder service.
         * @param string type url to fetch from the request types
         * @param object params GET parameters
         * @param object options $http optional options
         */
        BaseHTTPApi.prototype.request = function(type, params, options) {
            params = params || {};
            var url = this.getUrl(type, params);

            return $http.get(url);
        };

        return BaseHTTPApi;

    }
]);