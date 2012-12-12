#!/usr/bin/env node

var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	fs = require('fs'),
	sys = require('sys'),
	spawn = require('child_process').spawn,
	filename = process.argv[2],
	port = process.argv[3];

if ((process.argv.length < 3) || (process.argv.length > 4)) {
	console.error("Usage <node> <filename> [port]");
	process.exit(1);
}
if (! port) {
	port = 80;
}
var tail = spawn("tail", ["-f", filename]);
tail.stdout.setEncoding('utf8');
console.log("Tailing " + filename);

app.listen(port);
function handler(req, res) {
	fs.readFile(__dirname + '/tail.html', function(err, data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error loading tail.html');
		}

		res.writeHead(200);
		res.end(data);
	});

}

io.sockets.on('connection', function(socket) {
	socket.emit('msg', { data: "tailing " + filename });
	socket.emit('msg', { data: "------------------" });
	tail.stdout.on("data", function(data) {
		socket.emit('msg', { data: data });
	});
});

