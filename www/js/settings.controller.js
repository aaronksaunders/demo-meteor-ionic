angular
  .module('TutorApp')
  .controller('SettingsCtrl', SettingsCtrl);

function SettingsCtrl($state, $meteor) {

  var vm = this;

  vm.logoutBtnClicked = function () {
    $meteor.logout().then(function (_response) {
      $state.go('login');
    });
  }

}
