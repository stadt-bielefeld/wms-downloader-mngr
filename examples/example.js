/*
 * Load the wms-downloader-mngr module
 */
const mngr = require(__dirname + '/../index.js');
// const mngr = require('wms-download-mngr');

/*
 * Init options for wms-downloader-mngr
 */
const initOptions = {
  "mngr": {
    "workspace": __dirname + "/example1_workspace",
    "logs": __dirname + "/example.log",
    "maxOfSimultaneousTasks": 1,
    "deletionTimeoutOfCompletedTasks": 600000,
    "taskCacheExpiration": 10000
  },
  "request": {
    "userAgent": "wms-downloader",
    "timeout": 30000
  }
};

/*
 * Init the wms-downloader-mngr
 */
mngr.init(initOptions);

/*
 * Task 1 for wms-downloader-mngr
 */
const task1 = {
  "task": {
    "id": "id_of_task1",
    "title": "Stadtbezirke 1:15000 96DPI",
    "format": "image/png",
    "area": {
      "bbox": {
        "xmin": 455000,
        "ymin": 5750000,
        "xmax": 479000,
        "ymax": 5774000
      }
    }
  },
  "tiles": {
    "maxSizePx": 2500,
    "gutterPx": 250,
    "resolutions": [{
      "id": "15000",
      "scale": 15000,
      "dpi": 96
    }]
  },
  "wms": [{
    "id": "wms_stadtbezirke",
    "getmap": {
      "url": "http://www.bielefeld01.de/md/WMS/statistische_gebietsgliederung/02?",
      "kvp": {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": "stadtbezirke_pl",
        "STYLES": "",
        "CRS": "EPSG:25832",
        "FORMAT": "image/png",
        "TRANSPARENT": "TRUE"
      }
    }
  }]
};

/*
 * Task 2 for wms-downloader-mngr
 */
const task2 = {
  "task": {
    "id": "id_of_task2",
    "title": "Bebauungsplanübersicht 1:25000 96DPI",
    "format": "image/png",
    "area": {
      "bbox": {
        "xmin": 455000,
        "ymin": 5750000,
        "xmax": 479000,
        "ymax": 5774000
      }
    }
  },
  "tiles": {
    "maxSizePx": 2500,
    "gutterPx": 250,
    "resolutions": [{
      "id": "25000",
      "scale": 25000,
      "dpi": 96
    }]
  },
  "wms": [{
    "id": "wms_bielefeld_karte",
    "getmap": {
      "url": "http://www.bielefeld01.de/md/WMS/bielefeld_karte_farbe/02?",
      "kvp": {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": "map",
        "STYLES": "",
        "CRS": "EPSG:25832",
        "FORMAT": "image/png",
        "TRANSPARENT": "TRUE"
      }
    }
  }]
};

/*
 * Task 3 for wms-downloader-mngr
 */
const task3 = {
  "task": {
    "id": "id_of_task3",
    "title": "Bebauungsplanübersicht 1:2500 72DPI",
    "format": "image/png",
    "area": {
      "bbox": {
        "xmin": 455000,
        "ymin": 5750000,
        "xmax": 479000,
        "ymax": 5774000
      }
    }
  },
  "tiles": {
    "maxSizePx": 25000,
    "gutterPx": 250,
    "resolutions": [{
      "id": "25000",
      "scale": 25000,
      "dpi": 96
    }]
  },
  "wms": [{
    "id": "wms_bielefeld_karte_grau",
    "getmap": {
      "url": "https://www.bielefeld01.de/md/WMS/bielefeld_karte_grau/02?",
      "kvp": {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": "map",
        "STYLES": "",
        "CRS": "EPSG:25832",
        "FORMAT": "image/png",
        "TRANSPARENT": "TRUE"
      }
    }
  }]
};

/*
 * Add task 1 to wms-downloader-mngr
 */
mngr.addTask(task1, function (err) {
  if (err) {
    console.log('Can\'t add task 1: ' + err.message);
  } else {
    console.log('Added task 1.');
  }
});

/*
 * Add task 2 to wms-downloader-mngr
 */
mngr.addTask(task2, function (err) {
  if (err) {
    console.log('Can\'t add task 2: ' + err.message);
  } else {
    console.log('Added task 2.');
  }
});

/*
 * Add task 3 to wms-downloader-mngr
 */
mngr.addTask(task3, function (err) {
  if (err) {
    console.log('Can\'t add task 3: ' + err.message);
  } else {
    console.log('Added task 3.');
  }
});

/*
 * Remove task 3 after 19 seconds
 */
setTimeout(function () {
  mngr.removeTask(task3.task.id, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log(task3.task.id + ' was removed.');
    }
  });
}, 19000);
