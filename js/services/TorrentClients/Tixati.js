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
        },


        this.test = function() {
            //console.log("Testing settings");
            tixati.Disconnect();
            tixati.setConfig(this.model);
            tixati.connect().then(function(connected) {
                console.info("Tixati connected! (save settings)", connected);
                tixati.saveConfig();
            }, function(error) {
                console.error("Tixati connect error!", error);
            })
        }
    }
])



.factory('tixati', ['BaseTorrentClient', 'TixatiRemote',
    function(BaseTorrentClient, TixatiRemote) {

        var extended = angular.extend({}, BaseTorrentClient);

        extended.remoteClass = TixatiRemote;

        extended.setConfigMappings({
            server: 'tixati.server',
            port: 'tixati.port',
            username: 'tixati.username',
            password: 'tixati.password'
        });

        extended.setEndpints({
            torrents: '/transfers',
            portscan: '/home',
            infohash: '/transfers/%s/eventlog',
            torrentcontrol: '/transfers/%s/details/action', // POST [start, stop, remove, searchdht, checkfiles, delete] */
            addmagnet: '/transfers/action',
            files: '/transfers/%s/files'
        });


        extended.setParsers({
            portscan: function(result) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(result.data, "text/html");

                categories = {};
                categoriesList = [];
                Array.prototype.map.call(doc.querySelectorAll('.homestats tr:first-child th'), function(node) {
                    categoriesList.push(node.innerText);
                    categories[node.innerText] = {};
                });

                Array.prototype.map.call(doc.querySelectorAll('.homestats tr:not(:first-child)'), function(node) {
                    Array.prototype.map.call(node.querySelectorAll('td'), function(cell, idx) {
                        var cat = cell.innerText.split('  ');
                        categories[categoriesList[idx]][cat[0]] = cat[1];
                    });
                });

                return categories;
            },

            torrents: function(result) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(result.data, "text/html");
                var torrents = [];


                Array.prototype.map.call(doc.querySelectorAll('.xferstable tr:not(:first-child)'), function(node) {
                    var tds = node.querySelectorAll('td');

                    var torrent = {
                        name: tds[1].innerText,
                        bytes: tds[2].innerText,
                        progress: parseInt(tds[3].innerText),
                        status: tds[4].innerText,
                        downSpeed: tds[5].innerText,
                        upSpeed: tds[6].innerText,
                        priority: tds[7].innerText,
                        eta: tds[8].innerText,
                        guid: tds[1].querySelector('a').getAttribute('href').match(/\/transfers\/([a-z-A-Z0-9]+)\/details/)[1],
                        getName: nameFunc,
                        getProgress: progressFunc,
                        start: startFunc,
                        stop: stopFunc,
                        pause: stopFunc,
                        sendCommand: sendCommand,
                        isStarted: startedFunc,
                        getFiles: filesFunc
                    };
                    if ((torrent.guid in infohashCache)) {
                        torrent.hash = infohashCache[torrent.guid];
                        torrents.push(torrent);
                    } else {
                        request('infohash', torrent.guid).then(function(result) {
                            torrent.hash = infohashCache[torrent.guid] = result;
                            torrents.push(torrent);
                        });
                    }
                });
                return torrents;
            },

            infohash: function(result) {
                var magnet = result.data.match(/([0-9ABCDEFabcdef]{40})/);
                if (magnet && magnet.length) {
                    return magnet[0].toUpperCase();
                }
            },

            files: function(result) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(result.data, "text/html");

                var files = [];

                Array.prototype.map.call(doc.querySelectorAll('.xferstable tr:not(:first-child)'), function(node) {
                    var cells = node.querySelectorAll('td')
                    files.push({
                        name: cells[1].innerText.trim(),
                        priority: cells[2].innerText.trim(),
                        bytes: cells[3].innerText.trim(),
                        progress: cells[4].innerText.trim()
                    });
                });

                return files;

            }


        })

        extended.readConfig();

        extended.infohashCache = {};


        return extended;
    }
])


/**
 * uTorrent/Bittorrent remote singleton that receives the incoming data
 */
.factory('TixatiRemote', ["BaseTorrentRemote", "TixatiData",
    function(BaseTorrentRemote, TixatiData) {

        var extended = angular.extend({}, BaseTorrentRemote);
        extended.dataClass = TixatiData;

        return extended;
    }
]);


.run(["DuckieTorrent", "tixati",
    function(DuckieTorrent, tixati) {

        DuckieTorrent.register('tixati', tixati);

    }
])