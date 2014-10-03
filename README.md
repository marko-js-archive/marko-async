marko-async
=====================

The `marko-async` taglib provides support for the more efficient and simpler "Pull Model "approach to providing templates with view model data.

* __Push Model:__ Request all needed data upfront and wait for all of the data to be received before building the view model and then rendering the template.
* __Pull Model:__ Pass asynchronous data provider functions to template immediately start rendering the template. Let the template _pull_ the data needed during rendering.

The Pull Model approach to template rendering requires the use of a templating engine that supports asynchronous template rendering (e.g. [marko](https://github.com/raptorjs/marko) and [dust](https://github.com/linkedin/dustjs)). This is because before rendering the template begins not all of data may have been fully retrieved. Parts of a template that depend on data that is not yet available are rendered asynchronously with the Pull Model approach.

# Push Model versus Pull Model

The problem with the traditional Push Model approach is that template rendering is delayed until _all_ data has been fully received. This reduces the time to first byte, and it also may result in the server sitting idle while waiting for data to be loaded from remote services. In addition, if certain data is no longer needed by a template then only the template needs to be modified and not the controller.

With the new Pull Model approach, template rendering begins immediately. In addition, fragments of the template that depend on data from data providers are rendered asynchronously and wait only on the associated data provider to complete. The template rendering will only be delayed for data that the template actually needs.

# Example

```javascript
template.render({
        userProfileDataProvider: function(arg, callback) {
            var userId = arg.userId;
            userProfileService.getUserProfile(userId, callback);
        }
    }, ...);
```

```html
<async-fragment data-provider="data.userProfileDataProvider"
    var="userProfile"
    arg-userId="${data.userId}">

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
