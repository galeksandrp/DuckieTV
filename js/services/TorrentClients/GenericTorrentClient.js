DuckieTV.factory("GenericTorrentClient", function() {


});


.factory('BaseTorrentRemote', ["$rootScope",
    function($rootScope) {

        var service = {
            dataClass: null,
            torrents: {},
            settings: {},

            getTorrentName: function(torrent) {
                return torrent.name;
            },

            getTorrents: function() {
                var out = [];
                angular.forEach(service.torrents, function(el) {
                    out.push(el);
                });
                return out;
            },

            getByHash: function(hash) {
                hash = hash.toUpperCase();
                return (hash in service.torrents) ? service.torrents[hash] : null;
            },

            handleEvent: function(data) {
                var key = data.hash.toUpperCase();
                if (!(key in service.torrents)) {
                    if (!service.dataClass) {
                        throw "No data class set for this torrent remote!";
                    }
                    service.torrents[key] = new service.dataClass(data);
                } else {
                    service.torrents[key].update(data);
                }

                $rootScope.$broadcast('torrent:update:' + key, service.torrents[key]);
                $rootScope.$broadcast('torrent:update:', service.torrents[key]);
            },

            onTorrentUpdate: function(hash, callback) {
                $rootScope.$on('torrent:update:' + hash, function(evt, torrent) {
                    callback(torrent)
                });
            },

            offTorrentUpdate: function(hash, callback) {
                $rootScope.$off('torrent:update:' + hash, function(evt, torrent) {
                    callback(torrent)
                });
            }
        };
        return service;


    }
])



.factory('BaseTorrentClient', ["$q", "$http", "URLBuilder", "$parse", "SettingsService",
    function($q, $http, URLBuilder, $parse, SettingsService) {
        var self = this;

        this.config = {
            server: null,
            port: null,
            username: null,
            use_auth: null
        }

        this.endpoints = {
            torrents: null,
            portscan: null,
            addmagnet: null
        }

        this.configMappings: {
            server: null,
            port: null,
            username: null,
            password: null,
            use_auth: null
        }

        this.isPolling = false;
        this.isConnecting = false;
        this.connected = false;
        this.initialized = false;


        this.parsers = {

        }


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


        var service = {
            remoteClass: null,
            setConfig: function(config) {
                self.config = config;
            },

            saveConfig: function() {
                Object.keys(self.config).map(function(key) {
                    SettingsService.set(service.configMappings[key], self.config[key]);
                });
            },
            readConfig: function() {

            },
            setConfigMappings: function(mappings) {
                Object.keys(mappings).map(function(key) {
                    self.configMappings[key] = mappings[key];
                });
            },
            setEndpoints: function(endpoints) {
                Object.keys(endpoints).map(function(key) {
                    self.endpoints[key] = endpoints[key];

                });
            },
            setParsers: function(parsers) {
                self.parsers = parsers;
            }

            connect: function() {
                return request('portscan').then(function(result) {
                    console.log("Tixati check result: ", result);
                    self.connected = true;
                    self.isConnecting = false;
                    return true;
                })
            },

            /**
             * Return the interface that handles the remote data.
             */
            getRemote: function() {
                if (service.remoteClass === null) {
                    throw "No torrent remote assigned to this implementation!";
                }
                return service.remoteClass;
            },

            /**
             * Connect with an auth token obtained by the Pair function.
             * Store the resulting session key in $scope.session
             * You can call this method as often as you want. It'll return a promise that holds
             * off on resolving until the client is connected.
             * If it's connected and initialized, a promise will return that immediately resolves with the remote interface.
             */
            AutoConnect: function() {
                if (!self.isConnecting && !self.connected) {
                    self.connectPromise = $q.defer();
                    self.isConnecting = true;
                } else {
                    return (!self.connected || !self.initialized) ? self.connectPromise.promise : $q(function(resolve) {
                        resolve(methods.getRemote());
                    });
                }

                methods.connect().then(function(result) {
                    console.log("Tixati connected!");
                    if (!self.isPolling) {
                        self.isPolling = true;
                        methods.Update();
                    }
                    self.connectPromise.resolve(methods.getRemote());
                });

                return self.connectPromise.promise;
            },

            togglePolling: function() {
                self.isPolling = !self.isPolling;
                self.Update();
            },
            /**
             * Start the status update polling.
             * Stores the resulting TorrentClient service in $scope.rpc
             * Starts polling every 1s.
             */
            Update: function(dontLoop) {
                if (self.isPolling == true) {
                    methods.getTorrents().then(function(data) {
                        if (undefined === dontLoop && self.isPolling && !data.error) {
                            setTimeout(methods.Update, 3000);
                        }
                    });
                }
            },

            isConnected: function() {
                return self.connected;
            },

            Disconnect: function() {
                self.isPolling = false;
                tixatiRemote.torrents = {};
                tixatiRemote.eventHandlers = {};
            },

            /** 
             * Execute and handle the api's 'update' query.
             * Parses out the events, updates, properties and methods and dispatches them to the TorrentRemote interface
             * for storage, handling and attaching RPC methods.
             */
            getTorrents: function() {
                return request('torrents', {}).then(function(data) {
                        data.map(function(el) {
                            service.remoteClass.handleEvent(el);
                        });
                        return data;
                    },

                    function(error) {
                        console.error("Error executing get status query!", error);
                    });
            },

            addMagnet: function(magnet) {
                var fd = new FormData();
                fd.append('addlinktext', magnet);
                fd.append('addlink', 'Add');

                return $http.post(self.getUrl('addmagnet'), fd, {
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined
                    }
                })
            },
            execute: function(guid, formData) {
                return $http.post(self.getUrl('torrentcontrol', guid), formData, {
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined
                    }
                })
            },
            request: function(type, params, options) {
                return request(type, params, options);
            }

        };
        return service;
    }
])