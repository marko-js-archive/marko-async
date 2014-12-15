'use strict';

var logger = require('raptor-logging').logger(module);
var asyncWriter = require('async-writer');
var DataHolder = require('raptor-async/DataHolder');
var isClientReorderSupported = require('./client-reorder').isSupported;

function isPromise(o) {
    return o && typeof o.then === 'function';
}

function promiseToCallback(promise, callback, thisObj) {
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

    function requestData(provider, args, callback, thisObj) {

        if (isPromise(provider)) {
            // promises don't support a scope so we can ignore thisObj
            promiseToCallback(provider, callback);
            return;
        }

        if (typeof provider === 'function') {
            var data = (provider.length === 1) ?
            // one argument so only provide callback to function call
            provider.call(thisObj, callback) :

            // two arguments so provide args and callback to function call
            provider.call(thisObj, args, callback);

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

        var clientReorder = isClientReorderSupported && input.clientReorder === true;
        var asyncOut;
        var done = false;
        var timeoutId = null;
        var name = input.name || input._name;
        var scope = input.scope || this;

        function renderBody(err, data, timeoutMessage) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            done = true;

            var targetOut = asyncOut || out;

            if (err) {
                if (input.errorMessage) {
                    targetOut.write(input.errorMessage);
                } else {
                    targetOut.error(err);
                }
            } else if (timeoutMessage) {
                asyncOut.write(timeoutMessage);
            } else {
                if (input.invokeBody) {
                    input.invokeBody(targetOut, data);
                }
            }

            if (!clientReorder) {
                out.emit('asyncFragmentFinish', {
                    out: targetOut
                });
            }

            if (asyncOut) {
                asyncOut.end();

                // Only flush if we rendered asynchronously and we aren't using
                // client-reordering
                if (!clientReorder) {
                    out.flush();
                }
            }
        }

        var method = input.method;
        if (method) {
            dataProvider = dataProvider[method].bind(dataProvider);
        }

        requestData(dataProvider, arg, renderBody, scope);

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
                        renderBody(null, null, timeoutMessage);
                    } else {
                        renderBody(new Error(message));
                    }
                }, timeout);
            }

            if (clientReorder) {
                var asyncFragmentContext = out.global.__asyncFragments || (asyncFragmentContext = out.global.__asyncFragments = {
                    fragments: [],
                    nextId: 0
                });

                var id = input.name || asyncFragmentContext.nextId++;

                out.write('<span id="afph' + id + '">' + (input.placeholder || '') + '</span>');
                var dataHolder = new DataHolder();

                // Write to an in-memory buffer
                asyncOut = asyncWriter.create(null, {global: out.global});

                asyncOut
                .on('finish', function() {
                    dataHolder.resolve(asyncOut.getOutput());
                })
                .on('error', function(err) {
                    dataHolder.reject(err);
                });

                var fragmentInfo = {
                    id: id,
                    dataHolder: dataHolder,
                    out: asyncOut,
                    after: input.showAfter
                };

                if (asyncFragmentContext.fragments) {
                    asyncFragmentContext.fragments.push(fragmentInfo);
                } else {
                    out.emit('asyncFragmentBegin', fragmentInfo);
                }

            } else {
                out.flush(); // Flush everything up to this async fragment
                asyncOut = out.beginAsync({
                    timeout: 0, // We will use our code for controlling timeout
                    name: input.name
                });
            }
        }
    };
