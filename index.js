var jsonfile = require('jsonfile');
var fs = require('fs');
var rmdir = require('rmdir');
var downloader = require('wms-downloader');

/**
 * Default init options
 */
var initOptions = {
	"mngr" : {
		"workspace" : __dirname + "/tasks",
		"maxOfSimultaneousTasks" : 10,
		"deletionTimeoutOfCompletedTasks" : 600000,
		"taskCacheExpiration" : 10000
	},
	"request" : {
		"userAgent" : "wms-downloader",
		"timeout" : 30000,
		"proxy" : null
	}
};

var taskCache = {
	"lastUpdate" : null,
	"tasks" : {}
}

/**
 * Init wms-downloader
 */
downloader.init(initOptions);

setInterval(function() {
	getTasks(function(err, tasks) {
		console.log(tasks);

	});
}, 5000);

/**
 * Adds a download task.
 * 
 * @param {object}
 *          options
 * @param {function}
 *          callback function(err){}
 */
function addTask(options, callback) {

	// Override the task workspace, with the workspace of wms-downloader-mngr
	options.task.workspace = initOptions.mngr.workspace + '/tiles';

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
							"errorMessage" : ""
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
		console.log('Update cache');
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
				for ( var id in tasks) {
					var task = tasks[id];

					// Count not running tasks
					if ((task.dateOfProcess) && !(task.dateOfCompletion)) {
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
							callback(err);
						});
					});
				}
			});
		}
	});

}

observeTasks();

module.exports = {
	addTask : addTask,
	removeTask : removeTask,
	getTasks : getTasks,
	init : init
}
