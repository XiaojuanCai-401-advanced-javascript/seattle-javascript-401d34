'use strict';

const uuid = require('uuid').v4;
const io = require('socket.io')(3001);

const messages = {};

io.on('connection', (socket) => {

  console.log('Connected', socket.id);

  // --------------------------------------------------- //
  // Event handlers that deal with the Queue and delivery
  // --------------------------------------------------- /

  // When a client gets a message, they should reply back with a received event
  // passing along the message id, event name, and client id
  // we can then delete it from their queue
  socket.on('received', payload => {
    let { messageID, event, clientID } = payload;
    delete messages[event][clientID][messageID];
  });

  // On a "getall", anything in the queue for a user, for an event gets re-sent
  socket.on('getall', (data) => {
    try {
      let event = data.payload;
      let clientID = data.clientID;
      for (const messageID in messages[event][clientID]) {
        let payload = messages[event][clientID][messageID];
        io.in(clientID).emit(event, { messageID, payload });
      }
    }
    catch (e) { }
  });

  socket.on('subscribe', payload => {
    let { event, clientID } = payload;
    // Set Up the queue for their message
    // This could/should be a function call!
    if (!messages[event]) { messages[event] = {}; }
    if (!messages[event][clientID]) { messages[event][clientID] = {}; }
    // Put each client in their own "room" so that they can don't have to sift through all broadcasts
    socket.join(clientID);
  });

  // --------------------------------------------------- //
  // The only actual event handler specific to this app
  // --------------------------------------------------- //

  socket.on('package-delivered', (message) => {

    // What is message? It's got extra properties in it from the
    // Queue library, so we'll need to only actually re-broadcast
    // the .payload within it.  Do a console.log() to see the whole thing

    let messageID = uuid();

    // Log that we trired to send each user a message
    // for (const subscriber in messages['package-delivered']) {
    //   messages['package-delivered'][subscriber][messageID] = message.payload;
    // }

    messages['package-delivered'][message.payload.retailer][messageID] = message.payload;

    // Send them all out
    // This would go to every connected client for this event
    // socket.broadcast.emit('package-delivered', { messageID, payload: message.payload });

    // Because we put each client in their own "room", this only goes to them...
    io.in(message.payload.retailer).emit('package-delivered', { messageID, payload: message.payload });
  });

  // WHAT IF WE WANTED THIS SERVER TO NEVER HAVE TO WIRE SPECIFIC EVENTS
  // In other words ... a generic event handler so that anything that it
  // does not specifically need to monitor can just be passed through

  // --------------------------------------------------- //
  // Cool! Generic middleware that can be a catchall
  // We don't have to wire up EVERY kind of event!
  // YUCK! You have to do your own skipping, though
  // ... then call .next() to keep going
  // --------------------------------------------------- /

  // socket.use((packet, next) => {

  //   let event = packet[0];
  //   let message = packet[1];

  //   // Skip the events we manually wired up. Yuck
  //   if (event.match(/received|getall|subscribe/)) { return next(); }

  //   // What is message? It's got extra properties in it from the
  //   // Queue library, so we'll need to only actually re-broadcast
  //   // the .payload within it.  Do a console.log() to see the whole thing

  //   let messageID = uuid();

  //   // Log that we trired to send each user a message
  //   for (const subscriber in messages[event]) {
  //     messages[event][subscriber][messageID] = message.payload;
  //   }

  //   // Send them all out
  //   socket.broadcast.emit(event, { messageID, payload: message.payload });

  // });



});
