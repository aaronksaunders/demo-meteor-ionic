angular
    .module('TutorApp')
    .controller('ScheduleCtrl', ScheduleCtrl);

function ScheduleCtrl($scope, $cordovaDatePicker) {

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
