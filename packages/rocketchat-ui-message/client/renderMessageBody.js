/* global renderMessageBody:true */
import s from 'underscore.string';

renderMessageBody = message => {
	message.html = s.trim(message.msg) ? s.escapeHTML(message.msg) : '';
	const renderedMessage = RocketChat.callbacks.run('renderMessage', message);
	return renderedMessage.tokens.reverse()
		.reduce((html, { token, text }) => html.replace(token, () => text), renderedMessage.html);
};

/* exported renderMessageBody */
