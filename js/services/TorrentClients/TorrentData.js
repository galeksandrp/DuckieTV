/**
 * First off, we allow for easy prototype extension.
 * to be able to define extended objects and add implementations to the prototype automatically
 */

Function.prototype.extends = function(ParentClass, prototypeImplementations) {
    this.prototype = new ParentClass();
    // add all prototypeImplementations to the prototype chain for this function.
    Object.keys(prototypeImplementations || {}).map(function(key) {
        this[key] = prototypeImplementations[key];
    }, this.prototype);
    this.prototype.constructor = this;
};

/**
 * Base object for holding Torrent Data.
 * Individual clients extend this and implement the methods to adhere to the DuckieTorrent interface.
 */
function TorrentData(data) {
    this.files = [];
    this.update(data);
}

TorrentData.prototype.getClient = function() {
    return angular.element(document.body).injector().get('DuckieTorrent').getClient();
};

/**
 * Round a number with Math.floor so that we don't lose precision on 99.7%
 */
TorrentData.prototype.round = function(x, n) {
    return Math.floor(x * Math.pow(10, n)) / Math.pow(10, n);
};

/** 
 * load a new batch of data into this object
 */
TorrentData.prototype.update = function(data) {
    if (!data) {
        return;
    }
    Object.keys(data).map(function(key) {
        this[key] = data[key];
    }, this);
};

/**
 * Display name for torrent
 */
TorrentData.prototype.getName = function() {
    throw "function not implemented";
};

/**
 * Progress percentage 0-100. round to one digit to make sure that torrents are not stopped before 100%.
 */
TorrentData.prototype.getProgress = function() {
    throw "function not implemented";
};

/**
 * Send start command to the torrent client implementation for this torrent.
 */
TorrentData.prototype.start = function() {
    throw "function not implemented";
};

/**
 * Send stop command to the torrent client implementation for this torrent.
 */
TorrentData.prototype.stop = function() {
    throw "function not implemented";
};

/**
 * Send pause command to the torrent client implementation for this torrent.
 */
TorrentData.prototype.pause = function() {
    throw "function not implemented";
};


/**
 * Send get files command to the torrent client implementation for this torrent.
 */
TorrentData.prototype.getFiles = function() {
    throw "function not implemented";
};

/**
 * Send isStarted query to the torrent client implementation for this torrent.
 * @returns boolean
 */
TorrentData.prototype.isStarted = function() {
    throw "function not implemented";
};


/**
 * Client implementations
 */

/**
 * qBittorrent
 * Works for both 3.2+ and below.
 */
qBittorrentData = function(data) {
    this.update(data);
};

qBittorrentData.extends(TorrentData, {
    getName: function() {
        return this.name;
    },

    getProgress: function() {
        return this.round(this.percentDone * 100, 1);
    },

    start: function() {
        DuckieTorrent.getClient().execute('resume', this.hash);

    },

    stop: function() {
        this.pause();
    },

    pause: function() {
        DuckieTorrent.getClient().execute('pause', this.hash);
    },

    getFiles: function() {
        return DuckieTorrent.getClient().getFilesList(this.hash).then(function(results) {
            this.files = results;
        }.bind(this));
    },

    isStarted: function() {
        return this.status > 0;
    }
});


/**
 * Vuze - Exact same api as Transmission.
 *
var VuzeData = function(data) {
    this.update(data);
};

VuzeData.extends(TransmissionData); */