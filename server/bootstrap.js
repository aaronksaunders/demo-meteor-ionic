Meteor.startup(function () {
    if (Assessments.find().count() === 0) {

        var data = [{
                name: 'Ethan Gonzalez',
                picture: 'https://randomuser.me/api/portraits/thumb/men/1.jpg',
                lastMessage: {
                    text: 'Some Text',
                    timestamp: new Date()
                }
      },
            {
                name: 'Billy Bob Gonzalez',
                picture: 'https://randomuser.me/api/portraits/thumb/lego/1.jpg',
                lastMessage: {
                    text: 'Some Text',
                    timestamp: new Date()
                }
      }];

        data.forEach(item => {
            Assessments.insert(item);
        });
    }
});
