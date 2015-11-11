angular
  .module('TutorApp')
  .controller('ScheduleCtrl', ScheduleCtrl);

ScheduleCtrl.$inject = ['$scope', '$cordovaDatePicker'];

function ScheduleCtrl($scope, $cordovaDatePicker) {

  var vm = this;

  vm.selectDate = selectDate;


  /**
   *
   */
  function selectDate() {
    document.addEventListener("deviceready", function () {

      var options = {
        date: new Date(),
        mode: 'date', // or 'time'
        minDate: new Date() - 10000,
        allowOldDates: true,
        allowFutureDates: false,
        doneButtonLabel: 'DONE',
        doneButtonColor: '#F2F3F4',
        cancelButtonLabel: 'CANCEL',
        cancelButtonColor: '#000000'
      };
      $cordovaDatePicker.show(options).then(function (date) {
        alert(date);
      });

    }, false);
  }


}
