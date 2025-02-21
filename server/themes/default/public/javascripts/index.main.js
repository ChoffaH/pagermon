angular.module('app', ['ngRoute', 'ngResource', 'ngCookies', 'angular-highlight'])
  // Service
  .factory('socket', function ($rootScope) {
    var socket = io({transports: ['websocket'], upgrade: false});
    return {
      open: function () {
        socket = io({transports: ['websocket'], upgrade: false});
        socket.open();
      },
      on: function (eventName, callback) {
        socket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      },
      close: function () {
        socket.close();
      }
    };
  })


  .factory('adminSocket', function ($rootScope) {
    var adminSocket = io('/adminio', {transports: ['websocket'], upgrade: false});
    return {
      open: function () {
        adminSocket = io('/adminio', {transports: ['websocket'], upgrade: false});
        adminSocket.open();
      },
      on: function (eventName, callback) {
        adminSocket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(adminSocket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        adminSocket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(adminSocket, args);
            }
          });
        })
      },
      close: function () {
        adminSocket.close();
      }
    };
  })

  .factory('Api', ['$resource', function ($resource) {
    return {
      Messages: $resource('/api/messages/'),
      NewMessage: $resource('/api/messages/:id', {id: '@id'}),
      MessageSearch: $resource('/api/messageSearch/'),
      Agencies: $resource('/api/capcodes/agency')
    };
  }])

  .run(function ($anchorScroll, $window) {
    // hack to scroll to top when navigating to new URLS but not back/forward
    var wrap = function (method) {
      var orig = $window.window.history[method];
      $window.window.history[method] = function () {
        var retval = orig.apply(this, Array.prototype.slice.call(arguments));
        $anchorScroll();
        return retval;
      };
    };
    wrap('pushState');
    wrap('replaceState');
  })

  // Directive for popovers
  .directive('popoverContent', function ($compile) {
    return function (scope, element, attrs) {
      const contentType = attrs.popoverContent;
      let content = '';

      if (contentType === 'source') {
        content = `
          <button type="button" class="btn btn-primary" ng-click="updateFilter('address', message.source)">Filter</button>
        `;
      } else if (contentType === 'address') {
        content = `
          <button type="button" class="btn btn-primary" ng-click="updateFilter('address', message.address)">Filter</button>
          <a class="btn btn-primary" ng-if="message.alias_id && role == 'admin'" target="_blank" href="/admin/aliases/{{message.alias_id}}">Edit Alias</a>
          <a class="btn btn-primary" ng-if="(!message.alias_id || message.wildcard) && role == 'admin'" target="_blank" href="/admin/aliases/new?address={{message.address}}">Create Alias</a>
        `;
      } else if (contentType === 'agency') {
        content = `
          <button type="button" class="btn btn-primary" ng-click="updateFilter('agency', message.agency)">Filter</button>
        `;
      } else if (contentType === 'alias') {
        content = `
          <button type="button" class="btn btn-primary" ng-click="updateFilter('alias', message.alias_id)">Filter</button>
          <a class="btn btn-primary" ng-if="message.alias_id && role == 'admin'" target="_blank" href="/admin/aliases/{{message.alias_id}}">Edit Alias</a>
          <a class="btn btn-primary" ng-if="(!message.alias_id || message.wildcard) && role == 'admin'" target="_blank" href="/admin/aliases/new?address={{message.address}}">Create Alias</a>
        `;
      } 

      new bootstrap.Popover(element, {
        trigger: "focus",
        html: true,
        content: $compile(`
          <div class="vstack gap-3">${content}</div>
        `)(scope),
      });
    }
  })

  // Controller
  .controller('MessageController', ['$scope', '$routeParams', 'Api', 'socket', 'adminSocket', '$cookies', '$location', function ($scope, $routeParams, Api, socket, adminSocket, $cookies, $location) {
    $scope.role = role;
    $scope.page = parseInt($routeParams.page) || 1;
    $scope.query = $routeParams.q;
    $scope.address = $routeParams.address;
    $scope.agency = $routeParams.agency;
    $scope.alias = $routeParams.alias;
    $scope.filter = [];

    // Show the one-time modal after 3 seconds if the cookie is not set
    if (!$cookies.get('oneTimeModalShown')) {
      const oneTimeModal = document.getElementById('oneTimeModal');
      
      if (oneTimeModal) {
        oneTimeModal.addEventListener('hidden.bs.modal', () => {
          $scope.setCookie('oneTimeModalShown', 'true');
        });
        
        window.setTimeout(() => {
          bootstrap.Modal.getOrCreateInstance(oneTimeModal).show();
        }, 3000);
      }
    }

    // Get new message on socket event
    $scope.$on('$viewContentLoaded', function() {
      if (!apisecurity) {
        if (hidecapcode) {
          if ((login && role == 'admin')) {
            var socketMode = adminSocket
            adminSocket.open();
          } else {
            var socketMode = socket
            socket.open();
            adminSocket.close()
          }
        } else {
          if (pdwmode) {
            if ((login && role == 'admin')) {
              var socketMode = adminSocket
              adminSocket.open();
            } else {
              var socketMode = socket
              socket.open();
              adminSocket.close()
            }
          } else {
            var socketMode = socket
            socket.open();
            adminSocket.close()
          }
        }
      } else {
        if ((login && role == 'admin')) {
          var socketMode = adminSocket
          adminSocket.open();
        } else if (login) {
          var socketMode = socket
          socket.open();
          adminSocket.close()
        } else {
          var socketMode = socket
          socket.close();
          adminSocket.close();
        }
      }
      
      socketMode.on('messagePost', function(message) {
        // Send Browser Notifications  
        if (apisecurity) {
          if (login) {
            if ($scope.notificationEnabled == 'true') {
              if (!message.agency) {
                //Not showing messages for things that we don't know
              } else {
                
                notify("PagerMon - " +message.agency + " - " + message.alias,message.message);
              }
            }
          }
        } else {
          if ($scope.notificationEnabled == 'true') {
            if (!message.agency) {
              //Not showing messages for things that we don't know
            } else {
              
              notify("PagerMon - " +message.agency + " - " + message.alias,message.message);
            }
          }
        }
        
        // Only bother getting the new message if we're on page 1
        if ($scope.page === 1) {
          console.log('New Message ID: '+message.id + ' currentPage: '+$scope.init.currentPage);
          var timestamp = moment.unix(message.timestamp);
          message.date = timestamp.format("YYYY-MM-DD");
          message.time = timestamp.format("HH:mm");

          if ($routeParams.q || $routeParams.agency || $routeParams.alias || $routeParams.address) {
            if ($routeParams.q) {
              var patt = new RegExp($routeParams.q, 'i');
              if (patt.test(message.message) || patt.test(message.agency) || patt.test(message.address) || patt.test(message.alias) || patt.test(message.source)) {
                $scope.messages.unshift(message);
                $scope.messages.pop();
              }
            }
            if ($routeParams.agency) {
              var patt = new RegExp($routeParams.agency, 'i');
              if (patt.test(message.agency)) {
                $scope.messages.unshift(message);
                $scope.messages.pop();
              }
            }
            if ($routeParams.alias) {
              var patt = new RegExp($routeParams.alias, 'i');
              if (patt.test(message.alias_id)) {
                $scope.messages.unshift(message);
                $scope.messages.pop();
              }
            }
            if ($routeParams.address) {
              var patt = new RegExp($routeParams.address, 'i');
              if (patt.test(message.address) || patt.test(message.source)) {
                $scope.messages.unshift(message);
                $scope.messages.pop();
              }
            }
          } else {
            $scope.messages.unshift(message);
            $scope.messages.pop();
          }
        }
      });
    });

    $scope.updateFilter = function (filter, value = null) {
      switch (filter) {
        case "page":
          $scope.page = value;
          break;
        case "query":
          $scope.query = value;
          break;
        case "address":
          $scope.address = value;
          break;
        case "agency":
          $scope.agency = value;
          break;
        case "alias":
          $scope.alias = value;
          break;
      }

      if (filter !== "page") {
        $scope.page = 1;
      }

      $scope.updateUrl();
      $scope.updateData();
    };

    $scope.updateUrl = function () {
      const qArray = [];

      if ($scope.page > 1)
        qArray.push('page=' + encodeURIComponent($scope.page));
      if ($scope.query)
        qArray.push('q=' + encodeURIComponent($scope.query));
      if ($scope.address)
        qArray.push('address=' + encodeURIComponent($scope.address));
      if ($scope.agency)
        qArray.push('agency=' + encodeURIComponent($scope.agency));
      if ($scope.alias)
        qArray.push('alias=' + encodeURIComponent($scope.alias));
      
      // Default query string is "/" - this prevents the state from not passing on firefox
      let qString = '/';

      if (qArray.length > 0) {
        qString = '?' + qArray.join('&');
      }

      window.history.pushState('', '', qString);
    };
    
    // this should be popped out into a separate file
    $scope.updateData = function () {
      $scope.loading = true;
      $scope.filter = [];

      // check if browser supports notifications
      if ("Notification" in window) {
        $scope.notificationSupport = true;
      }

      // get limit from cookiestore
      const curPage = $scope.page;
      const limit = $cookies.get('messageLimit') || '';
      $scope.notificationEnabled = $cookies.get('notificationEnabled') || 'true';
      
      const queryObj = {};
      queryObj.page = curPage;
      queryObj.limit = limit;

      if ($scope.query) {
        queryObj.q = $scope.query;
        $scope.filter.push({ type: "query", value: $scope.query });
      }
      if ($scope.agency) {
        queryObj.agency = $scope.agency;
        $scope.filter.push({ type: "agency", value: $scope.agency });
      }
      if ($scope.address) {
        queryObj.address = $scope.address;
        $scope.filter.push({ type: "address", value: $scope.address });
      }
      if ($scope.alias) {
        queryObj.alias = $scope.alias;
        $scope.filter.push({ type: "alias", value: $scope.alias });
      }
      
      if (queryObj.q || queryObj.agency || queryObj.address || queryObj.alias) {
        Api.MessageSearch.get(queryObj).$promise.then(function (results) {
          $scope.handleResponse(results);
        }, function (error) {
          console.log('Error on Api.MessageSearch.query!', error);
          $scope.loading = false;
        });
      } else {
        Api.Messages.get({page: curPage, limit: limit}).$promise.then(function (results) {
          $scope.handleResponse(results);
        }, function (error) {
          console.log('Error on Api.Messages.query!', error);
          $scope.loading = false;
        });
      }
    };

    $scope.handleResponse = function (results) {
      results.init.currentPage++;
      let startPage, endPage;

      if (results.init.pageCount <= 10) {
        // less than 10 total pages so show all
        startPage = 1;
        endPage = results.init.pageCount;
      } else {
        // more than 10 total pages so calculate start and end pages
        if (results.init.currentPage <= 6) {
          startPage = 1;
          endPage = 10;
        } else if (results.init.currentPage + 4 >= results.init.pageCount) {
          startPage = results.init.pageCount - 9;
          endPage = results.init.pageCount;
        } else {
          startPage = results.init.currentPage - 5;
          endPage = results.init.currentPage + 4;
        }
      }
      var pages = $scope.range(startPage, endPage);
      results.init.pages = pages;
      $scope.init = results.init;
      angular.forEach(results.messages, function (result) {
        var timestamp = moment.unix(result.timestamp);
        result.date = timestamp.format("YYYY-MM-DD");
        result.time = timestamp.format("HH:mm");
        result.message = $scope.htmlEntities(result.message);
      });

      $scope.loading = false;
      $scope.messages = results.messages;
    };
    
    // helper functions below
    $scope.range = function (min, max, step) {
      step = step || 1;
      var input = [];
      for (var i = min; i <= max; i += step) {
        input.push(i);
      }
      return input;
    };
    
    $scope.htmlEntities = function (str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, ' ').replace(/>/g, ' ').replace(/"/g, '&quot;');
    }
    
    $scope.padDigits = function (number, digits) {
      return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
    }
    
    $scope.setCookie = function (cookie, value) {
      var expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 30);
      $cookies.put(cookie, value, { 'expires': expireDate });
      $scope.updateData();
    };
    
    $scope.toggleNotifications = function () {
      if ($scope.notificationEnabled == 'true') {
        $scope.setCookie('notificationEnabled', 'false');
      } else {
        $scope.setCookie('notificationEnabled', 'true');
        Notification.requestPermission(function (permission) {
          if (!('permission' in Notification)) {
            Notification.permission = permission;
          }
          
        });
      }
    };
    
    // Destroy socket when we navigate away
    $scope.$on('$destroy', function() {
      socket.close();
    });

    // Run the updateData function on load
    $scope.updateData();
  }])

  // Routes
  .config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider
    .when('/', {
      templateUrl: '/messages.html',
      controller: 'MessageController'
    })
    .when('/:page', {
      templateUrl: '/messages.html',
      controller: 'MessageController'
    })
    $locationProvider.html5Mode({ enabled: true, requireBase: false, rewriteLinks: false });
  }]);

function notify(notifyTitle, notifyMessage) {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
  } else if (Notification.permission === "granted") {
    var options = {
      body: notifyMessage,
      icon: '/favicon.ico'
    };
    var notification = new Notification(notifyTitle, options);
  }
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission(function (permission) {
      if (!('permission' in Notification)) {
        Notification.permission = permission;
      }
      
      if (permission === "granted") {
        var options = {
          body: notifyMessage,
          icon: '/favicon.ico',
        };
        var notification = new Notification(notifyTitle,options);
      }
    });
  }
}