DuckieTV


.factory('BaseTorrentRemote', ["$rootScope",
    function($rootScope) {

        var service = {
            dataClass: null,
            torrents: {},
            settings: {},

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
                    callback(torrent);
                });
            },

            offTorrentUpdate: function(hash, callback) {
                $rootScope.$off('torrent:update:' + hash, function(evt, torrent) {
                    callback(torrent);
                });
            }
        };
        return service;


    }
])


.factory('BaseTorrentClient', ["$q", "$http", "URLBuilder", "$parse", "SettingsService",
    function($q, $http, URLBuilder, $parse, SettingsService) {
        var self = this;

        this.name = 'Base Torent Client';

        this.config = {
            server: null,
            port: null,
            username: null,
            use_auth: null
        };

        this.endpoints = {
            torrents: null,
            portscan: null,
            addmagnet: null
        };

        this.configMappings = {
            server: null,
            port: null,
            username: null,
            password: null,
            use_auth: null
        };

        this.isPolling = false;
        this.isConnecting = false;
        this.connected = false;
        this.initialized = false;


        var service = {

            setConfig: function(config) {
                self.config = config;
            },

            saveConfig: function() {
                Object.keys(self.config).map(function(key) {
                    SettingsService.set(self.configMappings[key], self.config[key]);
                });
            },
            readConfig: function() {
                Object.keys(self.configMappings).map(function(key) {
                    self.config[key] = SettingsService.get(self.configMappings[key]);
                });
            },
            setName: function(name) {
                self.name = name;
            },
            getName: function(name) {
                return self.name;
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


            setRemote: function(remoteImplementation) {
                service.remoteClass = remoteImplementation;
            },

            /**
             * Return the interface that handles the remote data.
             */
            getRemote: function() {
                if (service.remoteClass === null) {
                    throw "No torrent remote assigned to " + service.getName() + "implementation!";
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
                if (self.isPolling === true) {
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
                service.getRemote().torrents = {};
                service.getRemote().eventHandlers = {};
            },

            /**
             * -------------------------------------------------------------
             * Implement the methods below when adding a new torrent client.
             * -------------------------------------------------------------             *
             */



            /**
             *
             *
             * Example:
             * return request('portscan').then(function(result) { // check if client webui is reachable
             *   console.log(service.getName() + " check result: ", result);
             *   self.connected = true; // we are now connected
             *   self.isConnecting = false; // we are no longer connecting
             *   return true;
             *  })
             */
            connect: function() {
                throw "connect not implemented for " + this.getName() + ". example in BaseTorrentClient.js";
            },

            /** 
             * Execute and handle the api's 'update' query.
             * Parses out the events, updates, properties and methods and dispatches them to the TorrentRemote interface
             * for storage, handling and attaching RPC methods.
             */
            getTorrents: function() {
                throw "getTorrents not implemented for " + this.getName();
            },

            /**
             * Implement this function to be able to add a magnet to the client
             */
            addMagnet: function(magnet) {
                throw "addMagnet not implemented for " + this.getName();
            },

            request: function(type, params, options) {
                return request(type, params, options);
            }

        };
        return service;
    }
]);