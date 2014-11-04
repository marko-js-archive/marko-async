'use strict';

var logger = require('raptor-logging').logger(module);
var asyncWriter = require('async-writer');
var DataHolder = require('raptor-async/DataHolder');
var isClientReorderSupported = require('./client-reorder').isSupported;

function isPromise(o) {
    return o && typeof o.then === 'function';
}

function promiseToCallback(promise, callback) {
    if (callback) {
        promise.then(
            function(data) {
                callback(null, data);
            },
            function(err) {
                callback(err);
            })
            .done();
    }

    return promise;
}

function requestData(provider, args, callback) {

    if (isPromise(provider)) {
        promiseToCallback(provider, callback);
        return;
    }

    if (typeof provider === 'function') {
        var data = provider(args, callback);
        if (data !== undefined) {
            if (isPromise(data)) {
                promiseToCallback(data, callback);
            }
            else {
                callback(null, data);
            }
        }
    } else {
        // Assume the provider is a data object...
        callback(null, provider);
    }

}

module.exports = function render(input, out) {
    var dataProvider = input.dataProvider;
    var arg = input.arg || {};
    arg.out = out;


    var clientReorder = input.clientReorder === true;
    var asyncOut;
    var done = false;
    var timeoutId = null;
    var name = input.name;

    function onError(e) {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        if (asyncOut) {
            asyncOut.error(e || 'Async fragment failed');
        } else {
            out.error(e);
        }
    }

    function renderBody(data) {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        done = true;

        if (input.invokeBody) {
            input.invokeBody(asyncOut || out, data);
        }

        if (asyncOut) {
            asyncOut.end();
        }

        if (!clientReorder) {
            out.flush();
        }
    }

    var method = input.method;
    if (method) {
        dataProvider = dataProvider[method].bind(dataProvider);
    }

    requestData(dataProvider, arg, function(err, data) {
        if (err) {
            return onError(err);
        }

        renderBody(data);
    });

    if (!done) {
        var timeout = input.timeout;
        var timeoutMessage = input.timeoutMessage;

        if (timeout == null) {
            timeout = 10000;
        } else if (timeout <= 0) {
            timeout = null;
        }

        if (timeout != null) {
            timeoutId = setTimeout(function() {
                var message = 'Async fragment (' + name + ') timed out after ' + timeout + 'ms';

                if (timeoutMessage) {
                    logger.error(message);
                    asyncOut.write(timeoutMessage);
                    asyncOut.end();
                } else {
                    onError(new Error(message));
                }
            }, timeout);
        }

        if (clientReorder && isClientReorderSupported) {
            var asyncFragmentContext = out.global.__asyncFragments || (asyncFragmentContext = out.global.__asyncFragments = {
                fragments: [],
                nextId: 0
            });

            var id = asyncFragmentContext.nextId++;

            out.write('<span id="afph' + id + '"></span>');
            var dataHolder = new DataHolder();

            // Write to an in-memory buffer
            asyncOut = asyncWriter.create(null, out.global);

            asyncOut
                .on('finish', function() {
                    dataHolder.resolve(asyncOut.getOutput());
                })
                .on('error', function(err) {
                    dataHolder.reject(err);
                });

            asyncFragmentContext.fragments.push({
                id: id,
                dataHolder: dataHolder,
                out: asyncOut
            });
        } else {
            asyncOut = out.beginAsync({
                timeout: 0, // We will use our code for controlling timeout
                name: input.name
            });
        }
    }
};
