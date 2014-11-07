window.$af = function(id) {
    var doc = document;

    var sourceEl = doc.getElementById('af' + id);
    var targetEl = doc.getElementById('afph' + id);
    var docFragment = doc.createDocumentFragment();
    var childNodes = sourceEl.childNodes;

    for (var i=0, len=childNodes.length; i<len; i++) {
        docFragment.appendChild(childNodes.item(0));
    }

    targetEl.parentNode.replaceChild(docFragment, targetEl);

    // sourceEl.parentNode.removeChild(sourceEl);
};