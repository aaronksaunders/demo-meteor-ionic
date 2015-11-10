angular
    .module('Whatsapp')
    .controller('AssessmentsCtrl', AssessmentsCtrl);

function AssessmentsCtrl($scope, $cordovaDatePicker) {
    $scope.assessments = $scope.$meteorCollection(Assessments, false);


    $cordovaDatePicker.show().then(function (date) {
        alert(date);
    });
}
