/* globals emojione */
Meteor.startup(function() {
	RocketChat.callbacks.add('beforeNotifyUser', (message) => emojione.shortnameToUnicode(message));
});
