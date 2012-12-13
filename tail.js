#!/usr/bin/env node

var app = require('http').createServer(handler),
	io = require('socket.io').listen(app),
	fs = require('fs'),
	sys = require('sys'),
	spawn = require('child_process').spawn,
	EventEmitter = require('events').EventEmitter,
	filename = process.argv[2],
	port = process.argv[3];

if ((process.argv.length < 3) || (process.argv.length > 4)) {
	console.error("Usage <node> <filename> [port]");
	process.exit(1);
}

if (! port) {
	port = 80;
}

var circular_buffer = [];
var buffer_size = 25;
var buffer_index = 0;

var Tailer = EventEmitter;
var tail = new Tailer();

var tail_pipe = spawn("tail", ["-f", '-n', buffer_size, filename]);
tail_pipe.stdout.setEncoding('utf8');
console.log("Tailing " + filename);

tail_pipe.stdout.on("data", function(data) {
	var lines = data.split('\n');
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim()
		if (line == "") {
			continue;
		}
		buffer_index = (buffer_index + 1) % buffer_size;
		circular_buffer[buffer_index] = line;
		tail.emit('data', buffer_index);
	}
});

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

	// Reply the last buffer_size lines to new clients...
	for (var i = 0; i < buffer_size; i++) {
		socket.emit('msg', {data: circular_buffer[(buffer_index + i) % buffer_size]});
	}

	tail.on('data', function(index) {
		socket.emit('msg', {data: circular_buffer[index]});
	});
});

