/* global renderMessageBody:true */
import s from 'underscore.string';

const replaceTokens = (html, tokens = []) => tokens.reverse()
	.reduce((html, { token, text }) => html.replace(token, () => text), html);

renderMessageBody = function(msg) {
	msg.html = msg.msg;

	if (s.trim(msg.html) !== '') {
		msg.html = s.escapeHTML(msg.html);
	}

	if (window.DOMParser && document.createTreeWalker) {
		const parser = new DOMParser();

		const message = RocketChat.callbacks.renderMessage.reduce((msg, callback) => {
			const htmlDocument = parser.parseFromString(msg.html, 'text/html');
			const treeWalker = htmlDocument.createTreeWalker(htmlDocument.body, NodeFilter.SHOW_TEXT, null, false);

			for (let textNode = treeWalker.nextNode(); textNode; textNode = treeWalker.nextNode()) {
				if (textNode.parentElement.nodeName === 'CODE') {
					continue;
				}

				const splitMsg = callback({ ...msg, html: textNode.nodeValue });
				splitMsg.html = replaceTokens(splitMsg.html, splitMsg.tokens);

				const replacementNode = document.createRange().createContextualFragment(splitMsg.html);
				textNode.parentNode.insertBefore(replacementNode, textNode);
				textNode.parentNode.removeChild(textNode);
			}

			return { ...msg, html: htmlDocument.body.innerHTML };
		}, msg);

		return replaceTokens(message.html, message.tokens);
	}

	const message = RocketChat.callbacks.run('renderMessage', msg);
	return replaceTokens(message.html, message.tokens);
};

/* exported renderMessageBody */
