/**
 * Transmission
 */
TransmissionData = function(data) {
    this.update(data);
};

TransmissionData.extends(TorrentData, {
    getName: function() {
        return this.name;
    },

    getProgress: function() {
        return this.round(this.percentDone * 100, 1);
    },

    start: function() {
        this.getClient().getAPI().execute('torrent-start', this.id);
    },

    stop: function() {
        this.getClient().getAPI().execute('torrent-stop', this.id);
    },

    pause: function() {
        this.stop();
    },

    isStarted: function() {
        return this.status > 0;
    },

    getFiles: function() {
        return this.files;
    }
});

DuckieTorrent


.factory('TransmissionAPI', ['BaseHTTPApi', '$http',
    function(BaseHTTPApi, $http) {

        var TransmissionAPI = function() {
            this.sessionID = null;
            var self = this;


            this.rpc = function(method, params, options) {
                var self = this,
                    request = {
                        'method': method
                    };

                for (var i in params) {
                    request[i] = params[i];
                }

                function handleError(e, f) {
                    self.sessionID = e.headers('X-Transmission-Session-Id');
                    if (e.status === 409) {
                        return self.rpc(method, request, options);
                    }
                }

                var headers = {
                    'X-Transmission-Session-Id': self.sessionID
                };

                if (this.config.use_auth) {
                    headers.Authorization = 'Basic ' + Base64.encode(this.config.username + ':' + this.config.password);
                }

                return $http.post(this.getUrl('rpc'), request, {
                    headers: headers
                }).then(function(response) {
                    return response.data;
                }, handleError);
            };

            this.portscan = function() {
                return this.rpc('session-get').then(function(result) {
                    return result !== undefined;
                }, function() {
                    return false;
                });
            };

            this.getTorrents = function() {
                return this.rpc('torrent-get', {
                    arguments: {
                        "fields": ["id", "name", "hashString", "status", "error", "errorString", "eta", "isFinished", "isStalled", "leftUntilDone", "metadataPercentComplete", "percentDone", "sizeWhenDone", "files"]
                    }
                }).then(function(data) {
                    return data.arguments.torrents.map(function(el) {
                        el.hash = el.hashString.toUpperCase();
                        return el;
                    });
                });
            };

            this.addMagnet = function(magnetHash) {
                return this.rpc('torrent-add', {
                    "arguments": {
                        "paused": false,
                        "filename": magnetHash
                    }
                });
            };

            this.execute = function(method, id) {
                return this.rpc(method, {
                    "arguments": {
                        ids: [id]
                    }
                });
            };
        };

        TransmissionAPI.prototype = BaseHTTPApi.prototype;
        TransmissionAPI.prototype.constructor = BaseHTTPApi;

        return new TransmissionAPI();
    }
])


.factory('Transmission', ["BaseTorrentClient", "TransmissionRemote", "TransmissionAPI",
    function(BaseTorrentClient, TransmissionRemote, TransmissionAPI) {

        var Transmission = function() {
            console.log("Created object transmission!");
            var self = this;
            this.constructor();

        };

        Transmission.prototype = BaseTorrentClient.prototype;
        Transmission.prototype.constructor = BaseTorrentClient;
        var service = new Transmission();

        //service.constructor();

        service.setName('Transmission');
        service.setAPI(TransmissionAPI);
        service.setRemote(TransmissionRemote);

        service.setConfigMappings({
            server: 'transmission.server',
            port: 'transmission.port',
            username: 'transmission.username',
            password: 'transmission.password',
            use_auth: 'transmission.use_auth'
        });

        service.setEndpoints({
            rpc: '/transmission/rpc'
        });

        service.readConfig();

        return service;
    }
])


.factory('TransmissionRemote', ["BaseTorrentRemote",
    function(BaseTorrentRemote) {

        var TransmissionRemote = function() {
            var self = this;
            this.torrents = {};
            this.constructor();

        };

        TransmissionRemote.prototype = BaseTorrentRemote.prototype;
        TransmissionRemote.prototype.constructor = BaseTorrentRemote;

        TransmissionRemote.prototype.dataClass = TransmissionData;

        return new TransmissionRemote();
    }
])

.run(["DuckieTorrent", "Transmission",
    function(DuckieTorrent, Transmission) {

        DuckieTorrent.register('Transmission', Transmission);

    }
]);