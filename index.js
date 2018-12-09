const TokenType = {
	BRACKETSTART: 0,
	BRACKETEND: 1,
	STRING: 2,
	END_DOC: 3,
};

const isBlank = (c)=> {
	return /\s/.test(c);
}

const toTimeStamp = (timeStr)=> {
	let timeList = timeStr.split(':')
		, ln = timeList.length - 1;
	return timeList.reduceRight((totalTime, time, idx)=>{
		return totalTime + time * Math.pow(60, ln - idx);
	}, 0).toFixed(2);
}

const Token = class {
	constructor(type, value) {
		this.type = type;
		this.value = value;
	}
}

const Reader = class {
	constructor(content) {
		this.content = content;
		this.ptr = 0;
		this.cache = '';
	}

	read(n=1) {
		this.cache = this.content.slice(this.ptr, this.ptr+n);
		this.ptr += this.cache.length;
		return this.cache.length ? this.cache : -1;
	}

	unread(n) {
		n = n || this.cache.length;
		this.ptr -= n;
	}
}

// read a string from reader
function readString(reader) {
	let value = '';
	while(true) {
		let c = reader.read();
		if(c === '[' 
			|| c === ']'
			|| c === -1
		) {
			break;
		} else {
			value += c;
		}
	}
	// the latest read character not belongs to the string, set it unread
	reader.unread();
	return new Token(TokenType.STRING, value);
}

// get tokens from lrc
const tokenizer = (reader)=> {
	let char;
	do {
		char = reader.read();
	} while(isBlank(char));

	if(char === '[') {
		return new Token(TokenType.BRACKETSTART, char);
	} else if(char === ']') {
		return new Token(TokenType.BRACKETEND, char);
	} else if(char === -1) {
		return new Token(TokenType.END_DOC, 'EOF');
	} else {
		// the char belongs to string, set it unread
		reader.unread();
		return readString(reader);
	}
}

// use tokens to build the list
const parser = (tokenList)=> {
	let timeStack = [];
	let inBracket = false;
	const lrcList = [];
	const info = {};

	tokenList.forEach(token=>{
		if(token.type === TokenType.BRACKETSTART) {
			inBracket = true;
		} else if(token.type === TokenType.BRACKETEND) {
			inBracket = false;
		} else if(inBracket) {
			if (/\d{2}:\d{2}\.\d{2}/.test(token.value)) {
				timeStack.push(token.value);
			} else {
				const [key, value] = token.value.split(':');
				info[key] = value;
			}
		} else {
			let time = null;
			while(time = timeStack.pop()) {
				lrcList.push({time, lrc: token.value, timestamp: toTimeStamp(time)});
			}
		}
	});

	lrcList.sort((prev, curr)=>{
		return prev.timestamp - curr.timestamp;
	});

	return {
		info,
		lrc: lrcList,
	};
}


module.exports = (lrc)=> {
	let reader = new Reader(lrc);
	let tokenList = [];
	while(true) {
		let token = tokenizer(reader);
		tokenList.push(token);
		if(token.type === TokenType.END_DOC) break;
	}
	return parser(tokenList);
}