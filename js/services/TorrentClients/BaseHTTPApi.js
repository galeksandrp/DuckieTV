var HTMLScraper = function(text) {

    var parser = new DOMParser(),
        this.doc = parser.parseFromString(result.data, "text/html");

    this.walkSelector = function(selector, callback) {
        return this.walkNodes(this.querySelectorAll(selector), callback);
    }

    this.querySelector = function(selector) {
        return this.doc.querySelector(selector);
    }

    this.querySelectorAll = function(selector) {
        return this.doc.querySelectorAll(selector);
    }

    this.walkNodes = function(nodes, callback) {
        return Array.prototype.map.call(nodes, callback);
    }

    return this;
}


DuckieTV.factory('BaseHTTPApi', ["$q", "$http",
    function($q, $http) {

        var self = this;
        this.parsers = {};

        /**
         * Fetches the url, auto-replaces the port in the url if it was found.
         */
        this.getUrl = function(type, param) {
            var out = self.config.server + ':' + self.config.port + this.endpoints[type];
            return out.replace('://', '://' + self.config.username + ':' + self.config.password + '@').replace('%s', encodeURIComponent(param));
        };

        /**
         * Automated parser for responses for usage when neccesary
         */
        this.getParser = function(type) {
            return (type in this.parsers) ? this.parsers[type] : function(data) {
                return data.data;
            };
        };


        /**
         * Build a JSON request using the URLBuilder service.
         * @param string type url to fetch from the request types
         * @param object params GET parameters
         * @param object options $http optional options
         */
        var request = function(type, params, options) {
            var d = $q.defer();
            params = params || {};
            var url = self.getUrl(type, params)
            var parser = self.getParser(type);

            $http.get(url).then(function(response) {
                    d.resolve(parser ? parser(response) : response.data);
                },
                function(errorCode) {
                    d.reject(errorCode);
                });

            return d.promise;
        };

        var methods = {
            setParsers: function(parsers) {
                self.parsers = parsers;
            },
        }

        return methods;
    }
])