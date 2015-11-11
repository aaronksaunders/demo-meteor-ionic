angular
    .module('TutorApp')
    .controller('AssessmentsCtrl', AssessmentsCtrl);

function AssessmentsCtrl($scope, $cordovaDatePicker) {
    $scope.assessments = $scope.$meteorCollection(Assessments, false);
}
