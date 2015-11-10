'use strict';

var angularMeteorCollection = angular.module('angular-meteor.collection',
  ['angular-meteor.stopper', 'angular-meteor.subscribe', 'angular-meteor.utils', 'diffArray']);

// The reason angular meteor collection is a factory function and not something
// that inherit from array comes from here:
// http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
// We went with the direct extensions approach.
angularMeteorCollection.factory('AngularMeteorCollection', [
  '$q', '$meteorSubscribe', '$meteorUtils', '$rootScope', '$timeout', 'diffArray',
  function($q, $meteorSubscribe, $meteorUtils, $rootScope, $timeout, diffArray) {
    function AngularMeteorCollection(curDefFunc, collection, diffArrayFunc, autoClientSave) {
      var data = [];
      // Server backup data to evaluate what changes come from client
      // after each server update.
      data._serverBackup = [];
      // Array differ function.
      data._diffArrayFunc = diffArrayFunc;
      // Handler of the cursor observer.
      data._hObserve = null;
      // On new cursor autorun handler
      // (autorun for reactive variables).
      data._hNewCurAutorun = null;
      // On new data autorun handler
      // (autorun for cursor.fetch).
      data._hDataAutorun = null;

      if (angular.isDefined(collection)) {
        data.$$collection = collection;
      } else {
        var cursor = curDefFunc();
        data.$$collection = $meteorUtils.getCollectionByName(cursor.collection.name);
      }

      angular.extend(data, AngularMeteorCollection);
      data._startCurAutorun(curDefFunc, autoClientSave);

      return data;
    }

    AngularMeteorCollection._startCurAutorun = function(curDefFunc, autoClientSave) {
      var self = this;
      self._hNewCurAutorun = Tracker.autorun(function() {
        // When the reactive func gets recomputated we need to stop any previous
        // observeChanges.
        Tracker.onInvalidate(function() {
          self._stopCursor();
        });
        if (autoClientSave) {
          self._setAutoClientSave();
        }
        self._updateCursor(curDefFunc(), autoClientSave);
      });
    };

    AngularMeteorCollection.subscribe = function() {
      $meteorSubscribe.subscribe.apply(this, arguments);
      return this;
    };

    AngularMeteorCollection.save = function(docs, useUnsetModifier) {
      // save whole collection
      if (!docs) docs = this;
      // save single doc
      docs = [].concat(docs);

      var promises = docs.map(function(doc) {
        return this._upsertDoc(doc, useUnsetModifier);
      }, this);

      var allPromise = $q.all(promises);

      allPromise.finally(function() {
        // calls digestion loop with no conflicts
        $timeout(angular.noop);
      });

      return allPromise;
    };

    AngularMeteorCollection._upsertDoc = function(doc, useUnsetModifier) {
      var deferred = $q.defer();
      var collection = this.$$collection;
      var createFulfill = _.partial($meteorUtils.fulfill, deferred, null);

      // delete $$hashkey
      doc = $meteorUtils.stripDollarPrefixedKeys(doc);
      var docId = doc._id;
      var isExist = collection.findOne(docId);

      // update
      if (isExist) {
        // Deletes _id property (from the copy) so that
        // it can be $set using update.
        delete doc._id;
        var modifier = useUnsetModifier ? {$unset: doc} : {$set: doc};
        // NOTE: do not use #upsert() method, since it does not exist in some collections
        collection.update(docId, modifier, createFulfill(function() {
          return {_id: docId, action: 'updated'};
        }));
      } 
      // insert
      else {
        collection.insert(doc, createFulfill(function(id) {
          return {_id: id, action: 'inserted'};
        }));
      }

      return deferred.promise;
    };

    // performs each update operation induvidualy to prevent conflics like
    AngularMeteorCollection._updateParallel = function(selector, modifier, callback) {
      var self = this;
      var operationsNames = _.keys(modifier);
      callback = callback || angular.noop;

      var done = _.after(operationsNames.length, callback);

      var next = function(err, affectedDocsNum) {
        if (err) return callback(err);
        done(null, affectedDocsNum);
      };

      operationsNames.forEach(function(operationName) {
        var contractedModifier = _.pick(modifier, operationName);
        self.$$collection.update(selector, contractedModifier, next);
      });
    };

    AngularMeteorCollection.remove = function(keyOrDocs) {
      var keys;
      // remove whole collection
      if (!keyOrDocs) {
        keys = _.pluck(this, '_id');
      } else {
        // remove docs
        keys = _.map([].concat(keyOrDocs), function(keyOrDoc) {
          return keyOrDoc._id || keyOrDoc;
        });
      }
      // Checks if all keys are correct.
      check(keys, [Match.OneOf(String, Mongo.ObjectID)]);

      var promises = keys.map(function(key) {
        return this._removeDoc(key);
      }, this);

      var allPromise = $q.all(promises);

      allPromise.finally(function() {
        $timeout(angular.noop);
      });

      return allPromise;
    };

    AngularMeteorCollection._removeDoc = function(id) {
      var deferred = $q.defer();
      var collection = this.$$collection;
      var fulfill = $meteorUtils.fulfill(deferred, null, { _id: id, action: 'removed' });
      collection.remove(id, fulfill);
      return deferred.promise;
    };

    AngularMeteorCollection._updateCursor = function(cursor, autoClientSave) {
      var self = this;

      // XXX - consider adding an option for a non-orderd result
      // for faster performance.
      if (self._hObserve) {
        self._hObserve.stop();
        self._hDataAutorun.stop();
      }

      var serverMode = false;
      function setServerUpdateMode(name) {
        serverMode = true;
        // To simplify server update logic, we don't follow
        // updates from the client at the same time.
        self._unsetAutoClientSave();
      }

      var hUnsetTimeout = null;
      // Here we use $timeout to combine multiple updates that go
      // each one after another.
      function unsetServerUpdateMode() {
        if (hUnsetTimeout) {
          $timeout.cancel(hUnsetTimeout);
          hUnsetTimeout = null;
        }
        hUnsetTimeout = $timeout(function() {
          serverMode = false;
          // Finds updates that was potentially done from the client side
          // and saves them.
          var changes = collectionUtils.diff(self, self._serverBackup,
            self._diffArrayFunc);
          self._saveChanges(changes);
          // After, continues following client updates.
          if (autoClientSave) {
            self._setAutoClientSave();
          }
        }, 0);
      }

      this._hObserve = cursor.observe({
        addedAt: function(doc, atIndex) {
          self.splice(atIndex, 0, doc);
          self._serverBackup.splice(atIndex, 0, doc);
          setServerUpdateMode();
        },

        changedAt: function(doc, oldDoc, atIndex) {
          diffArray.deepCopyChanges(self[atIndex], doc);
          diffArray.deepCopyRemovals(self[atIndex], doc);
          self._serverBackup[atIndex] = self[atIndex];
          setServerUpdateMode();
        },

        movedTo: function(doc, fromIndex, toIndex) {
          self.splice(fromIndex, 1);
          self.splice(toIndex, 0, doc);
          self._serverBackup.splice(fromIndex, 1);
          self._serverBackup.splice(toIndex, 0, doc);
          setServerUpdateMode();
        },

        removedAt: function(oldDoc) {
          var removedIndex = collectionUtils.findIndexById(self, oldDoc);

          if (removedIndex != -1) {
            self.splice(removedIndex, 1);
            self._serverBackup.splice(removedIndex, 1);
            setServerUpdateMode();
          } else {
            // If it's been removed on client then it's already not in collection
            // itself but still is in the _serverBackup.
            removedIndex = collectionUtils.findIndexById(self._serverBackup, oldDoc);

            if (removedIndex != -1) {
              self._serverBackup.splice(removedIndex, 1);
            }
          }
        }
      });

      this._hDataAutorun = Tracker.autorun(function() {
        cursor.fetch();
        if (serverMode) {
          unsetServerUpdateMode();
        }
      });
    };

    AngularMeteorCollection.stop = function() {
      this._stopCursor();
      this._hNewCurAutorun.stop();
    };

    AngularMeteorCollection._stopCursor = function() {
      this._unsetAutoClientSave();

      if (this._hObserve) {
        this._hObserve.stop();
        this._hDataAutorun.stop();
      }

      this.splice(0);
      this._serverBackup.splice(0);
    };

    AngularMeteorCollection._unsetAutoClientSave = function(name) {
      if (this._hRegAutoBind) {
        this._hRegAutoBind();
        this._hRegAutoBind = null;
      }
    };

    AngularMeteorCollection._setAutoClientSave = function() {
      var self = this;

      // Always unsets auto save to keep only one $watch handler.
      self._unsetAutoClientSave();

      self._hRegAutoBind = $rootScope.$watch(function() {
        return self;
      }, function(nItems, oItems) {
        if (nItems === oItems) return;

        self._unsetAutoClientSave();
        var changes = collectionUtils.diff(self, oItems,
          self._diffArrayFunc);
        self._saveChanges(changes);
        self._setAutoClientSave();
      }, true);
    };

    AngularMeteorCollection._saveChanges = function(changes) {
      var self = this;

      // Saves added documents
      // Using reversed iteration to prevent indexes from changing during splice
      var addedDocs = changes.added.reverse().map(function(descriptor) {
        self.splice(descriptor.index, 1);
        return descriptor.item;
      });
      if (addedDocs.length) self.save(addedDocs);

      // Removes deleted documents
      var removedDocs = changes.removed.map(function(descriptor) {
        return descriptor.item;
      });
      if (removedDocs.length) self.remove(removedDocs);

      // Updates changed documents
      changes.changed.forEach(function(descriptor) {
        self._updateParallel(descriptor.selector, descriptor.modifier);
      });
    };

    return AngularMeteorCollection;
}]);

angularMeteorCollection.factory('$meteorCollectionFS', ['$meteorCollection', 'diffArray',
  function($meteorCollection, diffArray) {
    function $meteorCollectionFS(reactiveFunc, autoClientSave, collection) {
      return new $meteorCollection(reactiveFunc, autoClientSave, collection, noNestedDiffArray);
    }

    var noNestedDiffArray = function(lastSeqArray, seqArray, callbacks) {
      return diffArray(lastSeqArray, seqArray, callbacks, true);
    };

    return $meteorCollectionFS;
}]);

angularMeteorCollection.factory('$meteorCollection', [
  'AngularMeteorCollection', '$rootScope', 'diffArray',
  function(AngularMeteorCollection, $rootScope, diffArray) {
    function $meteorCollection(reactiveFunc, autoClientSave, collection, diffArrayFunc) {
      // Validate parameters
      if (!reactiveFunc) {
        throw new TypeError('The first argument of $meteorCollection is undefined.');
      }

      if (!(angular.isFunction(reactiveFunc) || angular.isFunction(reactiveFunc.find))) {
        throw new TypeError(
          'The first argument of $meteorCollection must be a function or\
            a have a find function property.');
      }

      if (!angular.isFunction(reactiveFunc)) {
        collection = angular.isDefined(collection) ? collection : reactiveFunc;
        reactiveFunc = _.bind(reactiveFunc.find, reactiveFunc);
      }

      // By default auto save - true.
      autoClientSave = angular.isDefined(autoClientSave) ? autoClientSave : true;
      var ngCollection = new AngularMeteorCollection(reactiveFunc, collection,
        diffArrayFunc || diffArray, autoClientSave);

      return ngCollection;
    }

    return $meteorCollection;
 }]);

angularMeteorCollection.run([
  '$rootScope', '$meteorCollection', '$meteorCollectionFS', '$meteorStopper',
  function($rootScope, $meteorCollection, $meteorCollectionFS, $meteorStopper) {
    var scopeProto = Object.getPrototypeOf($rootScope);
    scopeProto.$meteorCollection = $meteorStopper($meteorCollection);
    scopeProto.$meteorCollectionFS = $meteorStopper($meteorCollectionFS);
 }]);


// Local utilities
var collectionUtils = {

  findIndexById: function(collection, doc) {
    var foundDoc = _.find(collection, function(colDoc) {
      // EJSON.equals used to compare Mongo.ObjectIDs and Strings.
      return EJSON.equals(colDoc._id, doc._id);
    });
    return _.indexOf(collection, foundDoc);
  },

  // Finds changes between two collections and saves differences.
  diff: function(newCollection, oldCollection, diffMethod) {
    var changes = {added: [], removed: [], changed: []};

    diffMethod(oldCollection, newCollection, {
      addedAt: function(id, item, index) {
        changes.added.push({item: item, index: index});
      },

      removedAt: function(id, item, index) {
        changes.removed.push({item: item, index: index});
      },

      changedAt: function(id, updates, index, oldItem) {
        changes.changed.push({selector: id, modifier: updates});
      },

      movedTo: function(id, item, fromIndex, toIndex) {
        // XXX do we need this?
      }
    });

    return changes;
  }
};
