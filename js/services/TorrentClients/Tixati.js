/**
 * Tixati DataStructure
 */
TixatiData = function(data) {
    this.update(data);
};

TixatiData.extends(TorrentData, {
    getName: function() {
        return this.name;
    },

    getProgress: function() {
        return parseInt(this.progres);
    },

    start: function() {
        var fd = new FormData();
        fd.append('start', 'Start');
        return DuckieTorrent.getClient().execute(this.guid, fd);
    },

    stop: function() {
        var fd = new FormData();
        fd.append('stop', 'Stop');
        return DuckieTorrent.getClient().execute(this.guid, fd);
    },
    pause: function() {
        return this.stop();
    },

    isStarted: function() {
        return this.status.toLowerCase().indexOf('offline') == -1;
    },

    getFiles: function() {
        DuckieTorrent.getClient().getFiles(this.guid).then(function(data) {
            this.files = data;
        }.bind(this));
    }
});


DuckieTorrent

.controller("tixatiCtrl", ["tixati", "SettingsService", "$filter",
    function(tixati, SettingsService, $filter) {

        this.model = {
            server: SettingsService.get('tixati.server'),
            port: SettingsService.get('tixati.port'),
            username: SettingsService.get('tixati.username'),
            password: SettingsService.get('tixati.password'),
        };

        this.fields = [{
            key: "server",
            type: "input",
            templateOptions: {
                label: "Tixati " + $filter('translate')('TIXATIjs/address/lbl'),
                type: "url",
            }
        }, {
            key: "port",
            type: "input",
            templateOptions: {
                label: $filter('translate')('TIXATIjs/port/lbl'),
                type: "number",
            }
        }, {
            key: "username",
            type: "input",
            templateOptions: {
                label: $filter('translate')('TIXATIjs/username/lbl')
            }
        }, {
            key: "password",
            type: "input",
            templateOptions: {
                label: $filter('translate')('TIXATIjs/password/lbl'),
                type: "password"
            }
        }, ];

        this.isConnected = function() {
            return tixati.isConnected();
        };


        this.test = function() {
            //console.log("Testing settings");
            tixati.Disconnect();
            tixati.setConfig(this.model);
            tixati.connect().then(function(connected) {
                console.info("Tixati connected! (save settings)", connected);
                tixati.saveConfig();
            }, function(error) {
                console.error("Tixati connect error!", error);
            });
        };
    }
])

.factory('TixatiAPI', ['BaseHTTPApi',
    function(BaseHTTPApi) {

        var extended = angular.extend({}, BaseHTTPAPI);

        extended.portscan = function() {
            return request('portscan').then(function(result) {
                var scraper = new HTMLScraper(result.data),
                    categories = {},
                    categoriesList = [];

                scraper.walkSelector('.homestats tr:first-child th', function(node) {
                    categoriesList.push(node.innerText);
                    categories[node.innerText] = {};
                });

                scraper.walkSelector('.homestats tr:not(:first-child)', function(node) {
                    scraper.walkNodes(node.querySelectorAll('td'), function(cell, idx) {
                        var cat = cell.innerText.split('  ');
                        categories[categoriesList[idx]][cat[0]] = cat[1];
                    });
                });

                return categories;
            });
        };

        extended.getTorrents = function() {
            return request('torrents', {}).then(function(data) {
                var scraper = new HTMLScraper(result.data);

                var torrents = [];

                scraper.walkSelector('.xferstable tr:not(:first-child)', function(node) {
                    var tds = node.querySelectorAll('td');

                    var torrent = new TixatiData({
                        name: tds[1].innerText,
                        bytes: tds[2].innerText,
                        progress: parseInt(tds[3].innerText),
                        status: tds[4].innerText,
                        downSpeed: tds[5].innerText,
                        upSpeed: tds[6].innerText,
                        priority: tds[7].innerText,
                        eta: tds[8].innerText,
                        guid: tds[1].querySelector('a').getAttribute('href').match(/\/transfers\/([a-z-A-Z0-9]+)\/details/)[1]
                    });
                    if ((torrent.guid in infohashCache)) {
                        torrent.hash = infohashCache[torrent.guid];
                        torrents.push(torrent);
                    } else {
                        service.getInfoHash(torrent.guid).then(function(result) {
                            torrent.hash = infohashCache[torrent.guid] = result;
                            torrents.push(torrent);
                        });
                    }
                });
                return torrents;
            });
        };

        extended.getInfoHash = function(guid) {
            return request('infohash', guid).then(function(result) {
                var magnet = result.data.match(/([0-9ABCDEFabcdef]{40})/);
                if (magnet && magnet.length) {
                    return magnet[0].toUpperCase();
                }
            });
        };

        extended.getFiles = function(guid) {
            return request('files', guid).then(function(result) {

                var scraper = new HTMLScraper(result.data);
                var files = [];

                scaper.walkSelector('.xferstable tr:not(:first-child)', function(node) {
                    var cells = node.querySelectorAll('td');
                    files.push({
                        name: cells[1].innerText.trim(),
                        priority: cells[2].innerText.trim(),
                        bytes: cells[3].innerText.trim(),
                        progress: cells[4].innerText.trim()
                    });
                });
                return files;

            });

        };
    }
])


.factory('Tixati', ['BaseTorrentClient', 'TixatiRemote',
    function(BaseTorrentClient, TixatiRemote, TixatiAPI) {

        var extended = angular.extend({}, BaseTorrentClient);

        extended.setName('Tixati');
        extended.setRemote(TixatiRemote);

        extended.setConfigMappings({
            server: 'tixati.server',
            port: 'tixati.port',
            username: 'tixati.username',
            password: 'tixati.password'
        });

        extended.setEndpoints({
            torrents: '/transfers',
            portscan: '/home',
            infohash: '/transfers/%s/eventlog',
            torrentcontrol: '/transfers/%s/details/action', // POST [start, stop, remove, searchdht, checkfiles, delete] */
            addmagnet: '/transfers/action',
            files: '/transfers/%s/files'
        });

        extended.infohashCache = {};


        /**
         * Perform 'portscan' / pingand set connected flag when that works.
         */
        extended.connect = function() {
            return TixatiAPI.portscan().then(function(result) { // check if client webui is reachable
                console.log(service.getName() + " check result: ", result);
                self.connected = true; // we are now connected
                self.isConnecting = false; // we are no longer connecting
                return true;
            });
        };

        /** 
         * Execute and handle the api's 'update' query.
         * Parses out the events, updates, properties and methods and dispatches them to the TorrentRemote interface
         * for storage, handling and attaching RPC methods.
         */
        extended.getTorrents = function() {
            return TixatiAPI.getTorrents()
                .then(function(data) {
                    data.map(function(el) {
                        service.getRemote().handleEvent(el);
                    });
                    return data;
                }, function(error) {
                    throw "Error executing Tixati getTorrents";
                });
        };

        extended.addMagnet = function(magnet) {
            var fd = new FormData();
            fd.append('addlinktext', magnet);
            fd.append('addlink', 'Add');

            return $http.post(self.getUrl('addmagnet'), fd, {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            });
        };

        extended.execute = function(guid, formData) {
            return $http.post(self.getUrl('torrentcontrol', guid), formData, {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            });
        };

        extended.readConfig();

        return extended;
    }
])


/**
 * uTorrent/Bittorrent remote singleton that receives the incoming data
 */
.factory('TixatiRemote', ["BaseTorrentRemote",
    function(BaseTorrentRemote) {

        var extended = angular.extend({}, BaseTorrentRemote);
        extended.dataClass = TixatiData;

        return extended;
    }
])


.run(["DuckieTorrent", "Tixati",
    function(DuckieTorrent, Tixati) {
        DuckieTorrent.register('Tixati', Tixati);
    }
]);