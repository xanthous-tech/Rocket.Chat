/*
 * KaTeX is a fast, easy-to-use JavaScript library for TeX math rendering on the web.
 * https://github.com/Khan/KaTeX
 */
import s from 'underscore.string';

import katex from 'katex';

class Boundary {
	length() {
		return this.end - this.start;
	}

	extract(str) {
		return str.substr(this.start, this.length());
	}
}

class Katex {
	constructor() {
		this.delimitersMap = [
			{
				opener: '\\[',
				closer: '\\]',
				displayMode: true,
				enabled: () => RocketChat.settings.get('Katex_Parenthesis_Syntax')
			}, {
				opener: '\\(',
				closer: '\\)',
				displayMode: false,
				enabled: () => RocketChat.settings.get('Katex_Parenthesis_Syntax')
			}, {
				opener: '$$',
				closer: '$$',
				displayMode: true,
				enabled: () => RocketChat.settings.get('Katex_Dollar_Syntax')
			}, {
				opener: '$',
				closer: '$',
				displayMode: false,
				enabled: () => RocketChat.settings.get('Katex_Dollar_Syntax')
			}
		];
	}

	findOpeningDelimiter(str, start) {
		const matches = (() => {
			const map = this.delimitersMap;
			const results = [];

			map.forEach((op) => {
				if (op.enabled()) {
					results.push({
						options: op,
						pos: str.indexOf(op.opener, start)
					});
				}
			});
			return results;
		})();

		const positions = (() => {
			const results = [];
			matches.forEach((pos) => {
				if (pos.pos >= 0) {
					results.push(pos.pos);
				}
			});
			return results;
		})();

		// No opening delimiters were found
		if (positions.length === 0) {
			return null;
		}

		//Take the first delimiter found
		const pos = Math.min.apply(Math, positions);

		const match_index = (()=> {
			const results = [];
			matches.forEach((m) => {
				results.push(m.pos);
			});
			return results;
		})().indexOf(pos);

		const match = matches[match_index];
		return match;
	}

	// Returns the outer and inner boundaries of the latex block starting
	// at the given opening delimiter
	getLatexBoundaries(str, openingDelimiterMatch) {
		const inner = new Boundary;
		const outer = new Boundary;

		// The closing delimiter matching to the opening one
		const closer = openingDelimiterMatch.options.closer;
		outer.start = openingDelimiterMatch.pos;
		inner.start = openingDelimiterMatch.pos + closer.length;

		// Search for a closer delimiter after the opening one
		const closer_index = str.substr(inner.start).indexOf(closer);
		if (closer_index < 0) {
			return null;
		}
		inner.end = inner.start + closer_index;
		outer.end = inner.end + closer.length;
		return {
			outer,
			inner
		};
	}

	// Searches for the first latex block in the given string
	findLatex(str) {
		let start = 0;
		let openingDelimiterMatch;

		while ((openingDelimiterMatch = this.findOpeningDelimiter(str, start++)) != null) {
			const match = this.getLatexBoundaries(str, openingDelimiterMatch);
			if (match && match.inner.extract(str).trim().length) {
				match.options = openingDelimiterMatch.options;
				return match;
			}
		}
		return null;
	}

	// Breaks a message to what comes before, after and to the content of a
	// matched latex block
	extractLatex(str, match) {
		const before = str.substr(0, match.outer.start);
		const after = str.substr(match.outer.end);
		let latex = match.inner.extract(str);
		latex = s.unescapeHTML(latex);
		return {
			before,
			latex,
			after
		};
	}

	// Takes a latex math string and the desired display mode and renders it
	// to HTML using the KaTeX library
	renderLatex(latex, displayMode) {
		let rendered;
		try {
			rendered = katex.renderToString(latex, {
				displayMode,
				macros: {
					'\\href': '' // override \href since allowedProtocols isn't working
				}
			});
		} catch (error) {
			const e = error;
			const display_mode = displayMode ? 'block' : 'inline';
			rendered = `<div class="katex-error katex-${ display_mode }-error">`;
			rendered += `${ s.escapeHTML(e.message) }`;
			rendered += '</div>';
		}
		return rendered;
	}

	// Takes a string and renders all latex blocks inside it
	render(str) {
		let result = '';
		while (this.findLatex(str) != null) {
			// Find the first latex block in the string
			const match = this.findLatex(str);
			const parts = this.extractLatex(str, match);

			// Add to the reuslt what comes before the latex block as well as
			// the rendered latex content
			const rendered = this.renderLatex(parts.latex, match.options.displayMode);
			result += parts.before + rendered;
			// Set what comes after the latex block to be examined next
			str = parts.after;
		}
		return result += str;
	}

	// Takes a rocketchat message and renders latex in its content
	renderMessage(message) {
		if (!RocketChat.settings.get('Katex_Enabled')) {
			return message;
		}

		if (typeof message === 'string') {
			return this.render(message);
		}

		if (!s.trim(message.html)) {
			return message;
		}

		message.html = this.render(message.html);

		return message;
	}
}

const instance = new Katex;

const cb = message => instance.renderMessage(message);

RocketChat.callbacks.add('renderMessage', cb, RocketChat.callbacks.priority.HIGH - 1, 'katex');

if (Meteor.isClient) {
	Blaze.registerHelper('RocketChatKatex', (text) => instance.renderMessage(text));
}
