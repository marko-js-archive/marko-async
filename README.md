marko-async
=====================

The `marko-async` taglib provides support for the more efficient and simpler "Pull Model "approach to providing templates with view model data.

* __Push Model:__ Request all needed data upfront and wait for all of the data to be received before building the view model and then rendering the template.
* __Pull Model:__ Pass asynchronous data provider functions to template immediately start rendering the template. Let the template _pull_ the data needed during rendering.

The Pull Model approach to template rendering requires the use of a templating engine that supports asynchronous template rendering (e.g. [marko](https://github.com/raptorjs/marko) and [dust](https://github.com/linkedin/dustjs)). This is because before rendering the template begins not all of data may have been fully retrieved. Parts of a template that depend on data that is not yet available are rendered asynchronously with the Pull Model approach.

# Push Model versus Pull Model

The problem with the traditional Push Model approach is that template rendering is delayed until _all_ data has been fully received. This reduces the time to first byte, and it also may result in the server sitting idle while waiting for data to be loaded from remote services. In addition, if certain data is no longer needed by a template then only the template needs to be modified and not the controller.

With the new Pull Model approach, template rendering begins immediately. In addition, fragments of the template that depend on data from data providers are rendered asynchronously and wait only on the associated data provider to complete. The template rendering will only be delayed for data that the template actually needs.

# async-fragment tag params

* data-provider: Mandatory parameter specifying the source of data for the async fragment
* var: name to use when consuming info from the data provider
* timeout: Override the default timeout of 10 seconds with this param. Units are in
  milliseconds so timeout="40000" would give a 40 second timeout.
* timeout-message: Message to output if the fragment times out. Specifying this
  will prevent the async fragment timeout from aborting.

# Example

```javascript
var template = require('marko').load(require.resolve('./template.marko'));

module.exports = function(req, res) {
    var userId = req.query.userId;
    template.render({
            userProfileDataProvider: function(callback) {

                userProfileService.getUserProfile(userId, callback);
            }
        }, res);
}
```

```html
<async-fragment data-provider="data.userProfileDataProvider"
    var="userProfile">

    <ul>
        <li>
            First name: ${userProfile.firstName}
        </li>
        <li>
            Last name: ${userProfile.lastName}
        </li>
        <li>
            Email address: ${userProfile.email}
        </li>
    </ul>

</async-fragment>
```

# Out-of-order Flushing

The marko-async taglib also supports out-of-order flushing. Enabling out-of-order flushing requires two steps:

1. Add the `client-reoder` attribute to the `<async-fragment>` tag:<br>

```html
<async-fragment data-provider="data.userProfileDataProvider"
    var="userProfile"
    client-reorder="true">

    <ul>
        <li>
            First name: ${userProfile.firstName}
        </li>
        <li>
            Last name: ${userProfile.lastName}
        </li>
        <li>
            Email address: ${userProfile.email}
        </li>
    </ul>

</async-fragment>
```

2. Add the `<async-fragments>` to the end of the page.

If the `client-reorder` is `true` then a placeholder element will be rendered to the output instead of the final HTML for the async fragment. The async fragment will be instead rendered at the end of the page and client-side JavaScript code will be used to move the async fragment into the proper place in the DOM. The `<async-fragments>` will be where the out-of-order fragments are rendered before they are moved into place. If there are any out-of-order fragments then inline JavaScript code will be injected into the page at this location to move the DOM nodes into the proper place in the DOM.
