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
        return this.getClient().getAPI().execute(this.guid, fd);
    },

    stop: function() {
        var fd = new FormData();
        fd.append('stop', 'Stop');
        return this.getClient().getAPI().execute(this.guid, fd);
    },
    pause: function() {
        return this.stop();
    },

    isStarted: function() {
        return this.status.toLowerCase().indexOf('offline') == -1;
    },

    getFiles: function() {
        this.getClient().getAPI().getFiles(this.guid).then(function(data) {
            this.files = data;
        }.bind(this));
    }
});


DuckieTorrent



.factory('TixatiAPI', ['BaseHTTPApi',
    function(BaseHTTPApi) {

        var TixatiAPI = function() {

        };
        TixatiAPI.prototype = Object.create(BaseHTTPApi.prototype);
        TixatiAPI.prototype.constructor = BaseHTTPApi;

        TixatiAPI.prototype.portscan = function() {
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

        TixatiAPI.prototype.getTorrents = function() {
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

        TixatiAPI.prototype.getInfoHash = function(guid) {
            return request('infohash', guid).then(function(result) {
                var magnet = result.data.match(/([0-9ABCDEFabcdef]{40})/);
                if (magnet && magnet.length) {
                    return magnet[0].toUpperCase();
                }
            });
        };

        TixatiAPI.prototype.getFiles = function(guid) {
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


        TixatiAPI.prototype.addMagnet = function(magnet) {
            var fd = new FormData();
            fd.append('addlinktext', magnet);
            fd.append('addlink', 'Add');

            return $http.post(this.getUrl('addmagnet'), fd, {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            });
        };

        TixatiAPI.prototype.execute = function(guid, formData) {
            return $http.post(this.getUrl('torrentcontrol', guid), formData, {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            });
        };


        return new TixatiAPI();
    }
])


.factory('Tixati', ['BaseTorrentClient', 'TixatiRemote', 'TixatiAPI',
    function(BaseTorrentClient, TixatiRemote, TixatiAPI) {

        var Tixati = function() {

        };

        Tixati.prototype = Object.create(BaseTorrentClient.prototype);
        Tixati.prototype.constructor = BaseTorrentClient;

        var service = new Tixati();

        service.setName('Tixati');
        service.setRemote(TixatiRemote);
        service.setAPI(TixatiAPI);

        service.setConfigMappings({
            server: 'tixati.server',
            port: 'tixati.port',
            username: 'tixati.username',
            password: 'tixati.password'
        });

        service.setEndpoints({
            torrents: '/transfers',
            portscan: '/home',
            infohash: '/transfers/%s/eventlog',
            torrentcontrol: '/transfers/%s/details/action', // POST [start, stop, remove, searchdht, checkfiles, delete] */
            addmagnet: '/transfers/action',
            files: '/transfers/%s/files'
        });

        service.infohashCache = {};
        service.readConfig();

        return service;
    }
])


/**
 * Tixati remote singleton that receives the incoming data
 */
.factory('TixatiRemote', ["BaseTorrentRemote",
    function(BaseTorrentRemote) {

        var TixatiRemote = function() {

        };

        TixatiRemote.prototype = Object.create(BaseTorrentRemote.prototype);
        TixatiRemote.prototype.constructor = BaseTorrentRemote;

        TixatiRemote.dataClass = TixatiData;

        return new TixatiRemote();
    }
])


.run(["DuckieTorrent", "Tixati",
    function(DuckieTorrent, Tixati) {
        DuckieTorrent.register('Tixati', Tixati);
    }
]);