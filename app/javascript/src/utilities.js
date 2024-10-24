/**
 * Utility functions
 * ----------------------------------------------------
 * Description:
 * Collection of useful utility functions for script inclusion.
 *
 * Requires: jQuery
 * Documentation:
 *
 **/



/* Single level object merging.
 * Merges object b into object a.
 * Returns a new object without storing references
 * to any existing contained object or values.
 *
 * Notes:
 * - Does not merge nested level objects.
 * - Duplicate properties overwrite existing.
 * @a      (Object) Receives key/values (overwriting it's own).
 * @b      (Object) Gives key/values, remaining unchanged.
 * @ignore (Array)  List of strings expected to match unwanted keys.
 **/
function mergeObjects(a, b, ignore) {
  for(var i in b) {
    if(b.hasOwnProperty(i)) {
      if(ignore && ignore.includes(i)) {
        continue;
      }
      a[i.toString()] = b[i]
    }
  }
  return a;
}


/* Nicety helper only, for those that prefer
 * to keep HTML strings out of code, where
 * possible.
 * e.g. instead of...
 *   var $node = $('<button class="something">Click me</button>');
 * can do...
 *   var $node = $(createElement("button", "Click me", "something"));
 * Hardly worth it, but makes code look pretty.
 **/
function createElement(tag, text, classes, attributes_value) {
  var node = document.createElement(tag);
  if (arguments.length > 1) {
    if(text != '' && text != undefined) {
      node.appendChild(document.createTextNode(text));
    }

    if(arguments.length > 2 && classes != '' && classes != undefined) {
      node.className = classes;
    }

    if(arguments.length > 3 && attributes_value != '' && attributes_value != undefined) {
      Object.entries(attributes_value.attributes).forEach(
        ([k, v]) => node.setAttribute(k, v)
      )

      if (attributes_value.value != undefined) {
        node.value = attributes_value.value
      }
    }
  }
  return document.body.appendChild(node);
}


/* Safe way to call a function that might not exist.
 * Example:
 *   config.runMyFunction();
 *
 *   The above call might blow up if runMyFunction does not exist or
 *   is not a function. Alternatively...
 *
 *   safelyActivateFunction(runMyFunction);
 *
 *   The above call should test it is a function and
 *   run it only if that proves true.
 *
 * @func (Function) Expected to be required function.
 *
 * Note: You can also pass in several other arguments (as is possible with
 * JavaScript functions, and these will be passed to the called function).
 **/
function safelyActivateFunction(func) {
  var args = Array.from(arguments);
  if(isFunction(func)) {
    if(args.length) {
      return func.apply(this, args.slice(1));
    }
    else {
      return func();
    }
  }
}


/* Expects a function but returns true/false depending on valid passed argument.
 **/
function isFunction(func) {
  return typeof(func) === 'function' || func instanceof Function;
}


/* Generates randomised number to add onto a passed string.
 * Useful when requiring unique ID values for dynamic elements.
 *
 * @str (String) Prefix for resulting unique string.
 **/
function uniqueString(str) {
  return str + Date.now() + String(Math.random()).replace(".","");
}


/* Utility funciton
 * Return the fragment identifier value from a URL.
 * Intended for use on an href value rather than document
 * location, which can use location.hash.
 * e.g. pass in
 * "http://foo.com#something" or
 * "http://foo.com#something?else=here"
 * and get "something" in either case.
 **/
function findFragmentIdentifier(url) {
  return url.replace(/^.*#(.*?)(?:(\?).*)?$/, "$1");
}


/* Gets value from <meta /> tag
 **/
function meta(name) {
  var meta = document.querySelector('meta[name=' + name + ']');
  return meta && meta.content;
}


/* Send POST request with token.
 * Can be used for sending Rails style delete links.
 * e.g. post('/path/to/some/resource', { _method: 'delete' });
 **/
function post(url, data) {
  var param = meta("csrf-param");
  var token = meta("csrf-token");
  var form = document.createElement("form");
  var params = {};

  params = mergeObjects(params, data);
  params[param] = token;

  form.setAttribute("action", url);
  form.setAttribute("method", "post");
  document.body.appendChild(form);

  // Add params.
  for(var param in params) {
    if(params.hasOwnProperty(param)) {
      let input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("name", param);
      input.setAttribute("value", params[param]);
      form.appendChild(input);
    }
  }
  form.submit();
}


/* Function used to update (or create if does not exist) a hidden
 * form input field that will be part of the submitted data
 * capture form (new content sent to server).
 *
 * @$form   (jQuery Object) The target form to send content back to the server.
 * @name    (String) Used as the name attribute on input[hidden] form elements.
 * @content (String) instance.content value added to input[hidden] field.
 **/
function updateHiddenInputOnForm($form, name, content) {
  var $input = $form.find("input[name=\"" + name + "\"]");
  if($input.length == 0) {
    $input = $("<input type=\"hidden\" name=\"" + name + "\" />");
    $form.prepend($input);
  }
  $input.val(content);
}


/* Function used to add a hidden form input field to an existing form.
 * The function does not check to see if exists so duplicates can result.
 *
 * @$form   (jQuery Object) The target form to send content back to the server.
 * @name    (String) Used as the name attribute on input[hidden] form elements.
 * @content (String) instance.content value added to input[hidden] field.
 **/
function addHiddenInpuElementToForm($form, name, content) {
  var $input = $("<input type=\"hidden\" name=\"" + name + "\" />");
  $form.prepend($input);
  $input.val(content);
}


/* Function returns specified property or undefined.
 *
 * This means you can safely do something like this:
 * var space = property(existingObject, "an.existing.property");
 *
 * ...without having to that everything exists first.
 *
 * Also, it means you can avoid undefined errors when doing this:
 * if(property(config, "this.is.missing")) {
 *   // Won't get here because condition will be testing against 'undefined'
 * }
 *
 **/
function property(context, props) {
  var split = (props != "" ? props.split(".") : []);
  if(context && split.length > 0) {
    context = property(context[split.shift()], split.join("."));
  }
  return context;
}


/* Determine if passed item is of Boolean origin.
 **/
function isBoolean(thing) {
  return thing.constructor === Boolean;
}


/* Simple AJAX wrapper to use a GET request and pass
 * response into a callback function. Maybe extend
 * with other features but currently not needed.
 **/
function updateDomByApiRequest(url, placement) {
  $.get(url, function(html) {
    var $node = $(html);
    switch(placement.type) {
      case "after": placement.target.after($node);
           break;
      case "before": placement.target.before($node);
           break;
      default: placement.target.append($node);
    }

    safelyActivateFunction(placement.done, $node);
  })
  .fail(function(xhr) {
    // If session has expired, redirect to login
    if(xhr.status === 401) {
      window.location.href='/';
    }
  });
}


function stringInject(str, injections) {
  for(var i in injections) {
    if(injections.hasOwnProperty(i)) {
      let re = new RegExp("#{" + i + "}", "mig");
      str = str.replace(re, injections[i]);
    }
  }
  return str;
}


/* Return the largest height found from items within a jQuery collection
 **/
function maxHeight($collection) {
  var max = 0;
  $collection.each(function() {
    var height = $(this).outerHeight();
    if(height > max) {
      max = height;
    }
  });
  return max;
}


/* Return the largest width found from items within a jQuery collection
 **/
function maxWidth($collection) {
  var max = 0;
  $collection.each(function() {
    var width = $(this).outerWidth();
    if(width > max) {
      max = width;
    }
  });
  return max;
}


/* Get the difference between two numbers
 * defaults to returning an absolute value
 **/
function difference(a, b, abs=true) {
  if(abs) {
    return Math.abs(a - b);
  } else {
    return a - b;
  }
}


/* Returns a sorted copy of the passed array starting from low to high.
 * If input was detected to be not worthy, you'll get an empty Array in response.
 * @numbers (Array) Array of numbers
 **/
function sortNumberArrayValues(numbers) {
  var result = [];
  if(arguments.length && (numbers.constructor == (new Array).constructor) && numbers.length) {
    result = numbers.slice();
    result.sort(function(a, b) {
      return a - b;
    });
  }
  return result;
}


/* Returns the lowest detected number from a passed array of numbers.
 * @numbers (Array) Array of numbers
 **/
function lowestNumber(numbers) {
  var sorted = sortNumberArrayValues(numbers);
  var result;

  if(sorted.length) {
    result = sorted[0];
  }

  return result;
}


/* Returns the highest detected number from a passed array of numbers.
 * @numbers (Array) Array of numbers
 **/
function highestNumber(numbers) {
  var sorted = sortNumberArrayValues(numbers);
  var result;

  if(sorted.length) {
    result = sorted[sorted.length - 1];
  }

  return result;
}
/* Filter an object using a passed callback function
  * @param {Object} obj - the object to be filtered
  * @param {callable} predicate - function used for filtering, should return a
  * boolean
  * @return {Object}
  */
function filterObject(obj, predicate) {
  return Object.fromEntries(
    Object.entries(obj).filter( predicate )
  );
}

function snakeToPascalCase( str ){
    str+='';
    str = str.split('_');
    for(var i=0;i<str.length;i++){
        str[i] = str[i].charAt(0).toUpperCase() + str[i].substring(1);
    }
    return str.join('');
}

// Determines if two rectangles have an intersection area
// a and b are objects with top,left, bottom, right coordinates
// @param {{x1: number y1: number, x2: number, y2: number}} a
// @param  {{x1: number y1: number, x2: number, y2: number}} b
// @return boolean
function intersects(a, b) {
	if (a.x1 > b.x2 || b.x1 > a.x2) return false; // no horizontal overlap
	if (a.y1 > b.y2 || b.y1 > a.y2) return false; // no vertical overlap

	return true;
}

// Determines if two ranges have an overlapping section
// ranges provided must be supplied ordered such that start < end
// @param {{start: number, end: number}} a
// @param {{start: number, end: number}} b
// @param {number} minimumOverlap
// @return boolean
function overlaps(a, b, minimumOverlap=0) {
  if( a.end - b.start >= 0 && b.end - a.start >=0 ) {
    const intersection = rangeIntersection(a,b);
    return (intersection.end - intersection.start) >= minimumOverlap;
  }
  return false;
}

function rangeIntersection(a,b) {
  return {
    start: Math.max(a.start, b.start),
    end: Math.min(a.end, b.end)
  }
}

function storageAvailable(type) {
  let storage;
  try {
    storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
      // acknowledge QuotaExceededError only if there's something already stored
      storage &&
      storage.length !== 0
    );
  }
}


// Make available for importing.
module.exports  = {
  mergeObjects: mergeObjects,
  createElement: createElement,
  safelyActivateFunction: safelyActivateFunction,
  isFunction: isFunction,
  uniqueString: uniqueString,
  findFragmentIdentifier: findFragmentIdentifier,
  meta: meta,
  post: post,
  addHiddenInpuElementToForm: addHiddenInpuElementToForm,
  updateHiddenInputOnForm: updateHiddenInputOnForm,
  property: property,
  isBoolean: isBoolean,
  updateDomByApiRequest:updateDomByApiRequest,
  stringInject: stringInject,
  maxHeight: maxHeight,
  maxWidth: maxWidth,
  difference: difference,
  sortNumberArrayValues: sortNumberArrayValues,
  lowestNumber:lowestNumber,
  highestNumber: highestNumber,
  filterObject: filterObject,
  snakeToPascalCase: snakeToPascalCase,
  intersects: intersects,
  overlaps: overlaps,
  storageAvailable: storageAvailable,
}
