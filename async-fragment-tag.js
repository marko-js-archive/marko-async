'use strict';
var raptorDataProviders = require('raptor-data-providers');
var logger = require('raptor-logging').logger(module);

module.exports = function render(input, context) {
    var dataProvider = input.dataProvider;

    var dataProviders = raptorDataProviders.forContext(context, false /* don't create if missing */);

    var arg = input.arg || {};

    arg.context = context;

    var asyncContext;
    var done = false;
    var timeoutId = null;
    var name = input.name;

    function onError(e) {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        asyncContext.error(e || 'Async fragment failed');
    }

    function renderBody(data) {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        done = true;
        try {
            if (input.invokeBody) {
                input.invokeBody(asyncContext || context, data);
            }

            if (asyncContext) {
                asyncContext.end();
            }
        } catch (e) {
            onError(e);
        }
    }

    var method = input.method;
    if (method) {
        dataProvider = dataProvider[method].bind(dataProvider);
    }

    try {
        dataProviders.requestData(dataProvider, arg, function(err, data) {
            if (err) {
                return onError(err);
            }

            renderBody(data);
        });
    } catch (e) {
        onError(e);
    }

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
                    asyncContext.write(timeoutMessage);
                    asyncContext.end();
                } else {
                    onError(new Error(message));
                }
            }, timeout);
        }

        asyncContext = context.beginAsync({
            timeout: 0, // We will use our code for controlling timeout
            name: input.name
        });
    }
};
