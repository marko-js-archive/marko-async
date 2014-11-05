var parallel = require('raptor-async/parallel');
var clientReorder = require('./client-reorder');

module.exports = function(input, out) {
    var global = out.global;

    out.flush();

    var asyncOut = out.beginAsync({ last: true, timeout: -1 });
    out.onLast(function(next) {
        var asyncFragmentsContext = global.__asyncFragments;

        if (!asyncFragmentsContext || !asyncFragmentsContext.fragments.length) {
            asyncOut.end();
            next();
            return;
        }

        var asyncTasks = asyncFragmentsContext.fragments.map(function(af) {
            return function(callback) {
                af.dataHolder.done(function(err, html) {

                    if (!global._afRuntime) {
                        asyncOut.write(clientReorder.getCode());
                        global._afRuntime = true;
                    }

                    asyncOut.write('<div id="af' + af.id + '" style="display:none">' +
                        html +
                        '</div>' +
                        '<script type="text/javascript">$af(' + af.id + ')</script>');

                    af.out.writer = asyncOut.writer;
                    out.emit('asyncFragmentFinish', {
                        out: af.out
                    });

                    out.flush();
                    callback();
                });
            };
        });

        parallel(asyncTasks, function(err) {
            if (err) {
                return asyncOut.error(err);
            }
            asyncOut.end();
            next();
        });
    });
};