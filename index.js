var jsonfile = require('jsonfile');
var fs = require('fs');
var rmdir = require('rmdir');
var downloader = require('wms-downloader');
var winston = require('winston');
// var downloader = require('../wms-downloader/index.js');

const
exec = require('child_process').exec;

/**
 * Default init options
 */
var initOptions = {
	"mngr" : {
		"workspace" : __dirname + "/tasks",
		"logs" : __dirname + "/logs/addedTasks.log",
		"maxOfSimultaneousTasks" : 10,
		"deletionTimeoutOfCompletedTasks" : 600000,
		"taskCacheExpiration" : 10000
	},
	"request" : {
		"userAgent" : "wms-downloader",
		"timeout" : 30000
	}
};

var taskCache = {
	"lastUpdate" : null,
	"tasks" : {}
};


function log(task){
	winston.info('Task was added.',task);
}


// setInterval(function() {
// getTasks(function(err, tasks) {
// console.log(tasks);
//
// });
// }, 5000);

/**
 * Adds a download task.
 *
 * @param {object}
 *          options
 * @param {function}
 *          callback function(err){}
 */
function addTask(options, callback) {

	log(options);

	createDir(initOptions.mngr.workspace, function(err) {

		// Path of task
		var pathOfTask = initOptions.mngr.workspace + '/' + options.task.id;

		// Path of tiles
		options.task.workspace = pathOfTask + '/tiles';

		// Create dir of this task
		fs.mkdir(pathOfTask, function(err) {

			if (err) {
				// Error
				callback(err);
			} else {
				// No Error

				// Write task.json
				jsonfile.writeFile(pathOfTask + '/task.json', options, function(err) {

					if (err) {
						// Error
						callback(err);
					} else {
						// No Error

						// Content of index.json
						var indexJSON = {
							"id" : options.task.id,
							"title" : options.task.title,
							"dateOfApplication" : (new Date()).toISOString(),
							"dateOfProcess" : "",
							"dateOfCompletion" : "",
							"errorMessage" : "",
							"zip" : false
						};

						// Write index.json
						jsonfile.writeFile(pathOfTask + '/index.json', indexJSON, function(err) {
							if (err) {
								// Error
								callback(err);
							} else {
								// No Error
								callback(null);
							}
						});
					}
				});
			}

		});

	});

}

/**
 * Removes a download task.
 *
 * @param {object}
 *          options
 * @param {function}
 *          callback function(err){}
 */
function removeTask(id, callback) {

	// Stop downloading and remove dir
	var progress = downloader.getProgress(id);
	if (progress) {
		downloader.cancelDownload(id, function(err) {
			if (err) {
				callback(err);
			} else {
				rmdir(initOptions.mngr.workspace + '/' + id, function(err, dirs, files) {
					callback(err);
				});
			}
		});
	} else {
		// If the task is not in process
		// Remove dir
		rmdir(initOptions.mngr.workspace + '/' + id, function(err, dirs, files) {
			callback(err);
		});
	}

}

/**
 * Returns all tasks
 *
 * @param {function}
 *          callback function(err, tasks){}
 */
function getTasks(callback) {

	var updateCache = false;

	if (taskCache.lastUpdate) {
		var timeOfCache = (new Date()).getTime() - taskCache.lastUpdate.getTime();
		if (timeOfCache > initOptions.mngr.taskCacheExpiration) {
			updateCache = true;
		}
	} else {
		updateCache = true;
	}

	if (updateCache) {

		fs.readdir(initOptions.mngr.workspace, function(err, items) {

			if (err) {
				// Error
				callback(err);
			} else {

				getTaskIndexJson(items, 0, [], callback);

			}

		});
	} else {
		callback(null, taskCache.tasks);
	}

}

/**
 * Reads task files recusive.
 *
 * @param items
 * @param index
 * @param tasksArray
 * @param callback
 */
function getTaskIndexJson(items, index, tasksArray, callback) {

	// Check, if items object includes new items
	if (index < items.length) {

		// Path of task index.json
		var indexFile = initOptions.mngr.workspace + '/' + items[index] + '/index.json';
		var taskFile = initOptions.mngr.workspace + '/' + items[index] + '/task.json';
		var zipFile = initOptions.mngr.workspace + '/' + items[index] + '/tiles.zip';

		// Load task index.json
		jsonfile.readFile(indexFile, function(err, obj) {

			if (err) {
				// Error
				callback(err);
			} else {
				// No Error

				var skipTask = false;

				if (obj.dateOfCompletion) {

					// Date of completition
					var dateObj = new Date(Date.parse(obj.dateOfCompletion));

					// Current date
					var dateCurrent = new Date();

					// Difference of dates in ms
					var diff = Math.round(dateCurrent.getTime() - dateObj.getTime());

					// Check timeout
					if (diff > initOptions.mngr.deletionTimeoutOfCompletedTasks) {
						skipTask = true;

						// Delete task
						removeTask(obj.id, function(err) {
							if (err) {
								console.log(err);
							} else {
								// Deletion finished
							}
						});
					}
				}

				if (!skipTask) {

					// Add paths of files
					obj.indexFile = indexFile;
					obj.taskFile = taskFile;

					if (obj.zip) {
						obj.zipFile = zipFile;
					}

					// Get progress
					if (obj.dateOfProcess) {
						obj.progress = downloader.getProgress(obj.id);
					}

					// Add this task
					tasksArray.push(obj);
				}

				// Get next task
				index++;
				getTaskIndexJson(items, index, tasksArray, callback);
			}
		});

	} else {
		// Loaded all tasks
		taskCache.lastUpdate = new Date();
		taskCache.tasks = tasksArray;
		callback(null, taskCache.tasks);
	}
}

/**
 * It inits the wms-downloader-mngr.
 *
 * @param options
 *          {object}
 */
function init(options) {
	if (options) {
		initOptions = options;
	}

	winston.add(winston.transports.File, { filename: initOptions.mngr.logs });
	winston.remove(winston.transports.Console);

	/**
	 * Init wms-downloader
	 */
	downloader.init(initOptions);
}

function observeTasks() {
	// Observe all tasks in an intervall
	setInterval(function() {

		// Determine all tasks
		getTasks(function(err, tasks) {

			if (err) {
				// TODO
			} else {

				var countOfRunningTasks = 0;

				// Iterate over all tasks
				for ( var id2 in tasks) {
					var task2 = tasks[id2];

					// Count not running tasks
					if ((task2.dateOfProcess) && !(task2.dateOfCompletion)) {
						countOfRunningTasks++;
					}
				}

				// Start tasks
				if (countOfRunningTasks < initOptions.mngr.maxOfSimultaneousTasks) {
					for ( var id in tasks) {
						var task = tasks[id];

						if (countOfRunningTasks < initOptions.mngr.maxOfSimultaneousTasks) {
							if (!(task.dateOfProcess) && !(task.dateOfCompletion)) {
								countOfRunningTasks++;

								startDownload(task, function(err) {

									if (err) {
										// TODO
									}
								});

							}
						} else {
							break;
						}
					}
				}
			}

		});

	}, initOptions.mngr.taskCacheExpiration);
}

function updateJSONfile(file, values, callback) {

	// Read file
	jsonfile.readFile(file, function(err, obj) {
		if (err) {
			callback(err);
		} else {

			// Update content
			for (var int = 0; int < values.length; int++) {
				obj[values[int].key] = values[int].value;
			}

			// Remove file
			fs.unlink(file, function(err) {
				if (err) {
					callback(err);
				} else {

					// Write file
					jsonfile.writeFile(file, obj, function(err) {
						if (err) {
							callback(err);
						} else {
							callback(err);
						}
					});
				}
			});
		}
	});

}

/**
 * Creates a new directory, if it does not exist.
 *
 * @param {string}
 *          path Path of new directory
 * @param {function}
 *          callback function(err){}
 */
function createDir(path, callback) {
	// Check if workspace exists
	fs.stat(path, function(err, stats) {
		if (err) {
			// Workspace not exists
			// Create workspace dir
			fs.mkdir(path, function(err) {
				callback(err);
			});
		} else {
			// Workspace exists
			callback(null);
		}
	});
}

function startDownload(task, callback) {

	// Read task json
	jsonfile.readFile(task.taskFile, function(err, objTask) {

		if (err) {
			callback(err);
		} else {

			// Update dateOfProcess
			updateJSONfile(task.indexFile, [ {
				"key" : "dateOfProcess",
				"value" : (new Date()).toISOString()
			} ], function(err) {
				if (err) {
					callback(err);
				} else {

					// Start download
					downloader.startDownload(objTask, function(err1) {

						console.log(objTask.task.id + ' is completed.');

						var errorMessage = '';
						if (err1) {
							errorMessage = err1.message;
						}

						// Update dateOfProcess
						updateJSONfile(task.indexFile, [ {
							"key" : "dateOfCompletion",
							"value" : (new Date()).toISOString()
						}, {
							"key" : "errorMessage",
							"value" : errorMessage
						} ], function(err) {
							if (err) {
								callback(err);
							} else {
								zipTask(objTask.task.id, function(err) {
									if (err) {
										callback(err);
									} else {
										updateJSONfile(task.indexFile, [ {
											"key" : "zip",
											"value" : true
										} ], function(err) {
											callback(err);
										});
									}
								});
							}
						});
					});
				}
			});
		}
	});
}

function zipTask(id, callback) {

	var pathOfTiles = initOptions.mngr.workspace + '/' + id + '/tiles/' + id;
	var zipFile = initOptions.mngr.workspace + '/' + id + '/tiles.zip';
	var command = '7z a -mx0 -tzip ' + '"' + zipFile + '" "' + pathOfTiles + '/*"';

	// Zip tiles
	var child = exec(command, function(err, stdout, stderr) {
		if (err) {
			callback(new Error(stderr));
		} else {
			// Remove tiles dir
			rmdir(initOptions.mngr.workspace + '/' + id + '/tiles', function(err, dirs, files) {
				callback(err);
			});

		}
	});

}

/**
 * Returns the config options of the wms-downloader.
 *
 * @returns {object} Config options of the wms-downloader
 */
function getConfig() {
	return initOptions;
}

observeTasks();

module.exports = {
	addTask : addTask,
	removeTask : removeTask,
	getTasks : getTasks,
	init : init,
	getRequestObject : downloader.getRequestObject,
	getConfig : getConfig
};
