Router.configure({
  layoutTemplate: 'ApplicationLayout'
});

Router.route('/', function () {
  this.render('Home')
});

if (Meteor.isClient) {

  Template.home.rendered = function () {
    console.log("rendered");

    var video = document.getElementById('vid');
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');

    var icanvas = document.getElementById("icanvas");
    var icontext = icanvas.getContext('2d');

    var cw = Math.floor(canvas.clientWidth / 10);
    var ch = Math.floor(canvas.clientHeight / 10);
    canvas.width = cw;
    canvas.height = ch;


    function componentToHex(c) {
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b) {
      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    var hex = "#000000";

    var send = function () {

      //console.log ("send");
      console.log (hex);
      Meteor.call('publish_message', "myTopic", hex,  function(err, response) {
        //console.log("err: " +err + " response: " + response);
      });

      
    }
    var draw = function (v,c,w,h) {
      if(video.paused || video.ended) return false;
      context.drawImage(v,0,0,w,h);
  
      var quality = 10;
      colorCount = 5;
      var imageData  = context.getImageData(0,0,w,h);
      var pixels     = imageData.data;
      var pixelCount = w*h;

      // Store the RGB values in an array format suitable for quantize function
      var pixelArray = [];
      for (var i = 0, offset, r, g, b, a; i < pixelCount; i = i + quality) {
          offset = i * 4;
          r = pixels[offset + 0];
          g = pixels[offset + 1];
          b = pixels[offset + 2];
          a = pixels[offset + 3];
          // If pixel is mostly opaque and not white
          if (a >= 125) {
              if (!(r > 250 && g > 250 && b > 250)) {
                  pixelArray.push([r, g, b]);
              }
          }
      }

      // Send array to quantize function which clusters values
      // using median cut algorithm
      var cmap    = MMCQ.quantize(pixelArray, colorCount);
      var palette = cmap? cmap.palette() : null;

      console.log(palette);

      hex = rgbToHex(palette[0][0],palette[0][1],palette[0][2]);
      
      setTimeout(draw,20,v,c,w,h);
    }

    setInterval(send,200);

    

    video.addEventListener('play', function(){
        draw(this,context,cw,ch);
    },false);
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
  config = {
    mqttHost: process.env.MQTTHost,
    mqttPort: 1883
  };
  // initialize the mqtt client from mqtt npm-package
  var mqtt = Meteor.npmRequire("mqtt");
  var client = mqtt.connect(config.mqttHost);
  client
    .on("connect", function() {
      console.log("client connected");
      client.subscribe('hello/world')
    })
    .on("message", function(topic, message) {
      console.log(topic + ": " + message);
    });

  Meteor.methods({
    topic_subscribe: function(topic) {
      client.subscribe(topic);
    },
    topic_unsubscribe: function(topic) {
      client.unsubscribe(topic);
    },
    publish_message: function(topic, message) {
      console.log("topic: " + topic);
      console.log("message: ", message); 
      client.publish(topic, message, function() {
        console.log("message sent: " + message);
      });
    }
  });
}
