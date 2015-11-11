angular
    .module('TutorApp')
    .controller('LoginCtrl', LoginCtrl);

function LoginCtrl($scope, $cordovaDatePicker) {
    $scope.assessments = $scope.$meteorCollection(Assessments, false);

    /**
     * [[Description]]
     * @param {Object} task [[Description]]
     */
    $scope.pickDate = function (task) {
        var options = {
            date: new Date(),
            mode: 'date'
        };
        //var options = {date: new Date(), mode: 'time'}; for time
        $cordovaDatePicker.show(options).then(function (date) {
            task.date = date;
        });
    }
}
