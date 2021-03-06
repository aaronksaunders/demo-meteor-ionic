// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular
  .module('TutorApp', [
    'angular-meteor',
    'ionic',
    'ngCordova'
  ])
  .run(run)
  .config(config);

function run($ionicPlatform, $rootScope, $state) {
  $ionicPlatform.ready(function () {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });


  $rootScope.$on('$stateChangeError',
    function (event, toState, toParams, fromState, fromParams, error) {
      // We can catch the error thrown when the $requireUser promise is rejected
      // and redirect the user back to the main page
      if (error === 'AUTH_REQUIRED') {
        $state.go('login');
      }
    });
}

function config($stateProvider, $urlRouterProvider) {
  $stateProvider
    .state('login', {
      url: '/login',
      templateUrl: 'templates/login.html',
      controller: 'LoginCtrl as vm'
    })
    .state('tab', {
      url: '/tab',
      abstract: true,
      templateUrl: 'templates/tabs.html',
      resolve: {
        user: ["$meteor", function ($meteor) {
          return $meteor.requireUser()
        }]
      }
    })
    .state('tab.schedule', {
      url: '/schedule',
      views: {
        'tab-schedule': {
          templateUrl: 'templates/schedule.html',
          controller: 'ScheduleCtrl as vm'
        }
      }
    })
    .state('tab.assessments', {
      url: '/assessments',
      views: {
        'tab-assessments': {
          templateUrl: 'templates/assessments.html',
          controller: 'AssessmentsCtrl'
        }
      }
    })
    .state('tab.settings', {
      url: '/settings',
      views: {
        'tab-settings': {
          templateUrl: 'templates/settings.html',
          controller: 'SettingsCtrl as vm'
        }
      }
    });

  $urlRouterProvider.otherwise('tab/schedule');
}
