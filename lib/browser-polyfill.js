/* webextension-polyfill - v0.10.0 - Thu Aug 18 2022 */
/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

if (typeof globalThis == "undefined") {
  globalThis = typeof window != "undefined" ? window : null;
  globalThis = typeof global != "undefined" ? global : globalThis;
}

(function (globalThis) {
  if (globalThis.browser?.runtime?.id) {
    return;
  }
  if (!globalThis.chrome?.runtime?.id) {
    throw new Error("No browser API found.");
  }

  /**
   * Returns true if the given object is an object with a `then` method, e.g. a
   * Promise.
   *
   * @param {*} value The value to test.
   * @returns {boolean} True if the value is thenable.
   */
  const isThenable = value => {
    return value && typeof value === "object" && typeof value.then === "function";
  };

  /**
   * Creates a wrapper function for a method with the given name, function, and
   * optional property descriptor, which wraps the function in a Promise that
   * resolves when the original method doesn't return a Promise, and resolves to
   * the same value.
   *
   * If the original function returns a Promise, the wrapper's Promise resolves or
   * rejects as the original Promise.
   *
   * @param {object} target The target object on which to define or modify a property.
   * @param {string} method The name of the method to wrap.
   * @param {function} wrapper The wrapper function that handles the Promise behavior.
   *                           This wrapper function is called with both the object
   *                           instance and its "this" binding. If the original
   *                           method isn't found on the target object instance,
   *                           this function is assumed to be the original method.
   * @param {object} [descriptor] An optional descriptor for the new property.
   * @returns {object} The original object.
   */
  const wrapMethod = (target, method, wrapper, descriptor = {}) => {
    let methodFunc = descriptor.value;
    if (!methodFunc) {
      const obj = target;
      // This happens when the API wrapper is instantiated before the method is
      // defined. Let's find the method on the prototype chain.
      while (obj && !methodFunc) {
        methodFunc = obj[method];
        if (typeof methodFunc != "function") {
          methodFunc = undefined;
        }
        obj = Object.getPrototypeOf(obj);
      }
    }
    if (!methodFunc) {
      // The method couldn't be found. This should only happen when the method
      // belongs to the chrome namespace but isn't supported in Firefox.
      methodFunc = wrapper;
    }

    let cache = new WeakMap();
    let wrappedMethod = function (...args) {
      if (!cache.has(this)) {
        cache.set(this, new Map());
      }
      const instanceMap = cache.get(this);
      // Store a reference to the original method, so that the wrapped one
      // can call it, if it needs to.
      if (!instanceMap.has(methodFunc)) {
        instanceMap.set(methodFunc, methodFunc.bind(this));
      }
      const originalMethod = instanceMap.get(methodFunc);
      return wrapper.call(this, originalMethod, ...args);
    };

    descriptor.value = wrappedMethod;
    // Install the wrapped method on the target.
    Object.defineProperty(target, method, descriptor);
    return target;
  };

  /**
   * Creates a wrapped version of chrome.*.send API call based on callbacks.
   * The Promise resolves when chrome API's callback is invoked, and rejects if
   * chrome.runtime.lastError is set when the callback is invoked.
   *
   * @param {function} originalMethod The original method to wrap with a Promise.
   * @param {Array} args The arguments to the method, including the callback func.
   * @returns {Promise} A Promise that resolves or rejects based on the result.
   */
  const wrapAsyncFunction = (originalMethod, ...args) => {
    return new Promise((resolve, reject) => {
      try {
        originalMethod(...args, ...callbackArgs => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (callbackArgs.length <= 1) {
            resolve(callbackArgs[0]);
          } else {
            resolve(callbackArgs);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  /**
   * Creates a wrapped version of chrome.*.addListener API call.
   * The Promise resolves when the listener is invoked.
   * If the listener returns a Promise, it waits for the promise to resolve.
   *
   * Firefox's addListener version will:
   * - Call the async callback.
   * - If it returns a Promise, will internally wait for the Promise to resolve,
   *   and prevent any other registered listeners to be called.
   * - If addListener returns a value, it will be sent as a result for sendMessage.
   *
   * Chrome's addListener will:
   * - Call the callback.
   * - Return a value for sendResponse.
   * - Allow other registered callbacks for an event to be called.
   *
   * In the general case, the wrapped listener:
   * - Passes all arguments to the callback.
   * - Checks if callback returns a promise.
   *   - If it is a promise, add a temporary listener to keep the messaging channel
   *     open with sendResponse({__mozWebExtensionPolyfillReject__: 1}) to prevent
   *     a response from this Promise being sent.
   *     Once the Promise resolves, call sendResponse.
   *   - If it's not a promise, call sendResponse immediately with the result.
   *
   * Some scenarios to consider:
   * 1. Browser - send message --> Extension (response)
   * 2. Extension - send message -> Tab (response)
   * 3. Extension - send message -> Extension (response)
   * 4. Extension - send message -> Native app (response)
   * 5. Native app - send message -> Extension (response)
   * 6. Within extension - message passing between scripts.
   *
   * @param {function} originalMethod The original chrome method to wrap.
   * @param {function} listener The event listener.
   * @returns {function} A wrapped version of the event listener.
   */
  const wrapEventListener = (originalMethod, listener) => {
    return (...args) => {
      const wrappedListener = (message, sender, sendResponse) => {
        try {
          const result = listener(message, sender, sendResponse);
          if (isThenable(result)) {
            // Asynchronous function is returning a promise
            result.then(
              result => {
                // This is important to check on Firefox + Chrome, because
                // on Chrome the sendResponse is actually a function.
                if (typeof sendResponse == "function") {
                  sendResponse(result);
                }
              },
              error => {
                /*
                 * There's no defined way to send back an error in Chrome, so
                 * we'll just send a POJO with a __mozWebExtensionPolyfillReject__ key.
                 * Firefox errors have message, fileName, lineNumber, stack.
                 * Chrome errors have message, stack.
                 */
                let errorObj;
                if (error && (error instanceof Error || typeof error.message === "string")) {
                  errorObj = {
                    __mozWebExtensionPolyfillReject__: true,
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                  };
                  if (error.hasOwnProperty("fileName")) {
                    errorObj.fileName = error.fileName;
                  }
                  if (error.hasOwnProperty("lineNumber")) {
                    errorObj.lineNumber = error.lineNumber;
                  }
                  if (error.hasOwnProperty("columnNumber")) {
                    errorObj.columnNumber = error.columnNumber;
                  }
                } else {
                  errorObj = {
                    __mozWebExtensionPolyfillReject__: true,
                    message: typeof error === "object" ? JSON.stringify(error) : String(error),
                  };
                }

                if (typeof sendResponse == "function") {
                  sendResponse(errorObj);
                }
              }
            );
            // Return true on Chrome to indicate async response.
            return true;
          } else if (result !== undefined) {
            if (typeof sendResponse == "function") {
              sendResponse(result);
            }
          }
        } catch (error) {
          /*
           * We still send the error back using sendResponse, but also throw,
           * because otherwise the callback has no way to signal the error. On
           * Firefox, the extension framework logs the error message to the
           * extension output. On Chrome, no message is shown (but the error is
           * still available in the browser's background console).
           */
          if (typeof sendResponse == "function") {
            sendResponse({
              __mozWebExtensionPolyfillReject__: true,
              message: error.message,
              name: error.name,
              stack: error.stack,
              fileName: error.fileName,
              lineNumber: error.lineNumber,
              columnNumber: error.columnNumber,
            });
          }
          throw error;
        }
      };
      return originalMethod(wrappedListener, ...args);
    };
  };

  /**
   * Wraps an object with accessor properties.
   *
   * @param {object} target The target object to wrap.
   * @param {object} source The source object to create accessors from.
   * @param {object} cache An optional cache object to store the wrapped objects.
   * @param {string[]} methods An optional list of methods to wrap.
   *
   * @returns {object} A wrapped object.
   */
  const wrapObject = (target, source, cache = new Map(), methods = []) => {
    for (const prop of Object.keys(source)) {
      if (!(prop in target)) {
        Object.defineProperty(target, prop, {
          configurable: true,
          enumerable: true,
          get() {
            let sourceValue = source[prop];
            if (typeof sourceValue === "function") {
              // This is a method on the source object
              if (methods.includes(prop)) {
                const method = { value: sourceValue };
                if (prop === "sendMessage") {
                  // We need to wrap this function in a special way
                  wrapMethod(target, prop, wrapAsyncFunction, method);
                } else if (prop === "addListener") {
                  // We need to wrap this function in a special way
                  wrapMethod(target, prop, wrapEventListener, method);
                } else {
                  wrapMethod(target, prop, function (originalMethod, ...args) {
                    return originalMethod.call(this, ...args);
                  }, method);
                }
              } else {
                // This is a function we don't need to wrap
                target[prop] = sourceValue;
              }
            } else if (typeof sourceValue === "object" && sourceValue !== null) {
              // This is an object we need to wrap
              let wrapper;
              if (cache.has(sourceValue)) {
                wrapper = cache.get(sourceValue);
              } else {
                wrapper = {};
                cache.set(sourceValue, wrapper);
                wrapObject(wrapper, sourceValue, cache, methods);
              }
              target[prop] = wrapper;
            } else {
              // This is a primitive
              target[prop] = sourceValue;
            }
            return target[prop];
          },
          set(value) {
            source[prop] = value;
          },
        });
      }
    }
    return target;
  };

  if (globalThis.browser) {
    // We already have the browser object, but make sure it has the chrome
    // object's members.
    wrapObject(globalThis.browser, globalThis.chrome, undefined, [
      "sendMessage",
      "addListener",
    ]);
  } else {
    // Create a browser object with the chrome object's members.
    globalThis.browser = {};
    wrapObject(globalThis.browser, globalThis.chrome, undefined, [
      "sendMessage",
      "addListener",
    ]);
  }
})(globalThis);
