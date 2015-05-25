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
        this.getClient().execute('torrent-start', this.id);
    },

    stop: function() {
        this.getClient().execute('torrent-stop', this.id);
    },

    pause: function() {
        this.stop();
    },

    isStarted: function() {
        return this.status > 0;
    }
});

DuckieTorrent


.factory('TransmissionAPI', ['BaseHTTPApi', '$http',
    function(BaseHTTPApi, $http) {

        var TransmissionAPI = function() {
            this.sessionID = null;

            var self = this;

            function rpc(method, params, options) {
                var
                    request = {
                        'method': method
                    };
                for (var i in params) {
                    request[i] = params[i];
                }

                function handleError(e, f) {
                    self.sessionID = e.headers('X-Transmission-Session-Id');
                    if (e.status === 409) {
                        return rpc(method, request, options);
                    }
                }

                var headers = {
                'X-Transmission-Session-Id': self.sessionID
                };

                if (self.config.use_auth) {
                    headers.Authorization = 'Basic ' + Base64.encode(self.config.username + ':' + self.config.password);
                }

                return $http.post(self.getUrl('rpc'), request, {
                    headers: headers
                }).then(function(response) {
                    return response.data;
                }, handleError);
            }

            this.portscan = function() {
                return rpc('session-get').then(function(result) {
                    return result !== undefined;
                });
            };

            this.getTorrents = function() {
                return rpc('torrent-get', {
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
                return rpc('torrent-add', {
                    "arguments": {
                        "paused": false,
                        "filename": magnetHash
                    }
                });
            };

            this.execute = function(method, id) {
                return rpc(method, {
                    "arguments": {
                        ids: [id]
                    }
                });
            };

        };

        TransmissionAPI.prototype = Object.create(BaseHTTPApi.prototype);
        TransmissionAPI.prototype.constructor = BaseHTTPApi;


        return new TransmissionAPI();
    }
])



.factory('Transmission', ["BaseTorrentClient", "TransmissionRemote", "TransmissionAPI",
    function(BaseTorrentClient, TransmissionRemote, TransmissionAPI) {

        var Transmission = function() {};

        Transmission.prototype = Object.create(BaseTorrentClient.prototype);
        Transmission.prototype.constructor = BaseTorrentClient;
        var service = new Transmission();

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

        };

        TransmissionRemote.prototype = Object.create(BaseTorrentRemote.prototype);
        TransmissionRemote.prototype.constructor = BaseTorrentRemote;

        TransmissionRemote.dataClass = TransmissionData;

        return new TransmissionRemote();
    }
])

.run(["DuckieTorrent", "Transmission",
    function(DuckieTorrent, Transmission) {

        DuckieTorrent.register('Transmission', Transmission);

    }
]);