exports.options = {
	username: Buffer.from([ 49, 54, 52, 50, 55 ]).toString(),
	lm_password: Buffer.from( [ 249, 228, 175, 198, 91, 141, 168, 223, 178, 108, 88, 86, 92, 16, 117, 252 ]),
	nt_password: Buffer.from( [ 138, 186, 9, 92, 155, 51, 65, 119, 141, 216, 251, 37, 250, 255, 86, 45 ])
};

if(require.main === module) {
	const httpntlm = require('httpntlm');
	const password = 'abc';
	console.dir(httpntlm.ntlm.create_LM_hashed_password(password));
	console.dir(httpntlm.ntlm.create_NT_hashed_password(password));
}
