angular
  .module('TutorApp')
  .controller('LoginCtrl', ['$meteor', '$scope', '$state', function ($meteor, $scope, $state) {

      var vm = this;
      vm.assessments = $scope.$meteorCollection(Assessments, false);

      /**
       * [[Description]]
       * @param {Object} task [[Description]]
       */
      vm.pickDate = function (task) {
        var options = {
          date: new Date(),
          mode: 'date'
        };
        //var options = {date: new Date(), mode: 'time'}; for time
        $cordovaDatePicker.show(options).then(function (date) {
          task.date = date;
        });
      };

      vm.credentials = {
        email: '',
        password: ''
      };
      /**
       *
       */
      vm.loginBtnClicked = function () {
        $meteor.loginWithPassword(vm.credentials.email, vm.credentials.password).then(function (_response) {
          console.log('Login success ', _response);
          $state.go('tab.schedule');
        }, function (_error) {
          console.log('Login error - ', _error);
          alert("Error: " + _error.reason);
        });
        return false;
      };

      vm.createAccountBtnClicked = function () {
        $meteor.createUser({
          username: vm.credentials.email,
          email: vm.credentials.email,
          password: vm.credentials.password,
          profile: {expertize: 'Developer'}
        }).then(function (_response) {
          console.log('Login success');
          $state.go('tab.schedule');
        }, function (_error) {
          console.log('Login error - ', _error);
          alert("Error: " + _error.reason);
        });
        return false;
      };

    }]
  );
