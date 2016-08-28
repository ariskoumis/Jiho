
currentSynth = 0;
synths = [];

live = false;

var requestAnimationFrame = window.requestAnimationFrame;

var halfStepTranslation = {
  65: 1,
  87: 2,
  83: 3,
  69: 4,
  68: 5,
  70: 6,
  84: 7,
  71: 8,
  89: 9,
  72: 10, // 0
  85: 11,
  74: 12,
  75: 13,
  79: 14,
  76: 15,
  80: 16,
  186: 17,
  222: 18,
  221: 19
};

var octave = 0;

console.log('ws://' + window.location.host.split(':')[0] + ':8080/')
 
// var primus = new Primus('ws://' + window.location.host.split(':')[0] + ':8080/', {});
// primus.on('data', (data) => {

//   if (data.halfStep && typeof data.state == "boolean") {
//     onlineKeys[data.halfStep] = data.state;
//   }

//   console.log(data);
// })


Streamy.on('play', function(d) {
  if (d.play) {
    synths[d.synth].on(d.note)
  } else {
    synths[d.synth].off(d.note)
  }
})


function LoadBuffer(ctx, url, cb) {

  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    ctx.decodeAudioData(
      request.response,
      function(buffer) {
        cb(buffer)
      },
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.send();
}

window.addEventListener('keydown', (event) => {

  if (keys[event.which]) {
    return;
  }

  keys[event.which] = true;

  console.log(event.which);

  var halfStep = halfStepTranslation[event.which];

  if (halfStep) {
    // primus.write({halfStep: halfStep + octave*12, state: true});
    if (live) {

      Streamy.emit('note', { note: halfStep + octave*12, play: true, synth: currentSynth });

    } else {

      onlineKeys[halfStep + octave*12] = true;
      offlineKeys[halfStep + octave*12] = true;
      sequencer.keyHeads[halfStep + octave*12].addClass("key-highlight");

    }
  }

  if (event.which == 90) {
    octave--;
  } else if (event.which == 88) {
    octave++;
  }

});

window.addEventListener('keyup', (event) => {
  keys[event.which] = false;

  var halfStep = halfStepTranslation[event.which];

  if (halfStep) {
    if (live) {

      Streamy.emit('note', { note: halfStep + octave*12, play: false, synth: currentSynth });

    } else {

    // primus.write({halfStep: halfStep + octave*12, state: false});
      onlineKeys[halfStep + octave*12] = false;
      offlineKeys[halfStep + octave*12] = false;
      sequencer.keyHeads[halfStep + octave*12].removeClass("key-highlight");
    }
  }
});


function freq(halfStep) {

  return Math.floor(Math.pow(Math.pow(2, 1/12), halfStep) * 220);
}

var context = new (window.AudioContext || window.webkitAudioContext)();

class BufferLoader {
  constructor(context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = new Array();
    this.loadCount = 0;
  }

  loadBuffer(url, index) {
    // Load buffer asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    var loader = this;

    request.onload = function() {
      // Asynchronously decode the audio file data in request.response
      loader.context.decodeAudioData(
        request.response,
        function(buffer) {
          if (!buffer) {
            alert('error decoding file data: ' + url);
            return;
          }
          loader.bufferList[index] = buffer;
          if (++loader.loadCount == loader.urlList.length)
            loader.onload(loader.bufferList);
        },
        function(error) {
          console.error('decodeAudioData error', error);
        }
      );
    }

    request.onerror = function() {
      alert('BufferLoader: XHR error');
    }

    request.send();
  }

  load() {
    for (var i = 0; i < this.urlList.length; ++i)
    this.loadBuffer(this.urlList[i], i);
  };
}

function loadSounds(soundMap) {
    return new Promise((resolve, reject) => {
        let names = [];
        let paths = [];
        let result = {};
        for (let name in soundMap) {
            let path = soundMap[name];
            names.push(name);
            paths.push(path);
        }
        
        var bufferLoader = new BufferLoader(context, paths, (bufferList) => {
            for (let i = 0; i < bufferList.length; i++) {
                let buffer = bufferList[i];
                let name = names[i];
                result[name] = buffer;
            }
            resolve(result);
        });
        bufferLoader.load();
    });
}


function playSound(buffer, time) {
    let source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source[source.start ? 'start' : 'noteOn'](0);
}

gPlaySound = playSound;

function bus(nodes) {
  var last = null;
  for (var node of nodes) {
    if (!last) {
      continue;
    }

    last.connect(node);
    last = node;
  }

  return {first: nodes[0], last: nodes[nodes.length-1]};
}


convolver = context.createConvolver();
convolver.connect(context.destination);
LoadBuffer(context, "/reverb.wav", (buffer) => {
  convolver.buffer = buffer;
  console.log(buffer);
});

var master = bus([
  convolver,
  context.destination
])

if (!context.createGain)
  context.createGain = context.createGainNode;
if (!context.createDelay)
  context.createDelay = context.createDelayNode;
if (!context.createScriptProcessor)
  context.createScriptProcessor = context.createJavaScriptNode;

class Voice {
  constructor() {

    this.gainNode = context.createGain();
    this.gainNode.connect(master.first);
    this.gainNode.gain.value = 0;

    this.oscillator = context.createOscillator();
    this.oscillator.type = 'square';
    this.oscillator.frequency.value = 440;
    this.oscillator.detune.value = 0;
    this.oscillator.connect(this.gainNode);
    this.start();
    
    this.offset = 0;

  }

  start() {
    this.oscillator[this.oscillator.start ? 'start' : 'noteOn'](0);
    this.playing = true;
  }

  stop() {
    this.oscillator.stop();
    this.playing = false;
  }

  setNote(halfStep) {
    var offset = 0;
    if (this.oscillator.type == 'sine') {
      offset = 12*3
    }

    this.setFreq(freq(halfStep - 10 + offset + this.offset));
  }

  setFreq(freq) {
    if (freq !== this.oscillator.frequency.value) {
      this.oscillator.frequency.setValueAtTime(freq, 0);
    }
  }

  setVol(vol) {
    this.gainNode.gain.value = vol;
  }
}

class BassVoice extends Voice {
  constructor() {
    super();

    this.offset = -12
    this.oscillator.type = 'sawtooth';
  }
}

drumSounds = {}
loadSounds({
  kick: '/wav/kick.wav',
  snare: '/wav/snare.wav',
  hihat: '/wav/closedhat.wav',
  openhat: '/wav/openhat.wav',
  metro: '/wav/youngmetro.wav'
}).then((ugh) => {
  drumSounds = ugh;
});

class DrumVoice extends Voice {
  constructor() {
    super();

    this.pressed = false;
    this.oscillator.type = 'sine';
  }

  setNote(note) {
    if (this.pressed) return;
    this.pressed = true;

    if (note % 4 == 0) {
      playSound(drumSounds.kick);
    } else if (note % 4 == 1) {
      playSound(drumSounds.snare)
    } else if (note % 4 == 2) {
      playSound(drumSounds.hihat);
    } else if (note % 4 == 3) {
      playSound(drumSounds.openhat);
    }
  }

  setVol(vol) {
    if (vol == 0) {
      this.pressed = false;
    }
  }
}

class Synth {
  constructor() {
    this.voices = [];
    this.voicePool = [];

    this.Voice = Voice;
  }

  on(halfStep) {
    var voice = this.voices[halfStep];
    if (!voice) {
      if (this.voicePool.length > 0) {
        voice = this.voicePool.pop();
      } else {
        voice = new this.Voice();
      }
      this.voices[halfStep] = voice;
    }
    voice.setNote(halfStep);
    voice.setVol(0.6);
  }

  off(halfStep) {
    if (this.voices[halfStep]) {
      this.voices[halfStep].setVol(0);

      this.voicePool.push(this.voices[halfStep]);
      this.voices[halfStep] = undefined;
      delete this.voices[halfStep];
    }
  }

  silence() {

    for (var voice of this.voicePool) {
      voice.setVol(0);
    }

    for (var halfStep in this.voices) {
        this.voices[halfStep].setVol(0);

        this.voicePool.push(this.voices[halfStep]);
        this.voices[halfStep] = undefined;
        delete this.voices[halfStep];
    }

  }
}

class BassSynth extends Synth {
  constructor() {
    super();
    this.Voice = BassVoice;
  }
}

class DrumSynth extends Synth {
  constructor() {
    super()
    this.Voice = DrumVoice;
  }
}

synths.push(new DrumSynth());
synths.push(new Synth());
synths.push(new BassSynth());

function step() {

  if (!pianoOn) {
    requestAnimationFrame(step);
    return;
  }

  for (var halfStep in onlineKeys) {
    var halfStepNum = parseInt(halfStep);
    if (halfStepNum == -1000) {
      halfStepNum = 0
    }
    if (typeof halfStepNum === "number" && onlineKeys[halfStep] === true) {
      synths[currentSynth].on(halfStepNum);
    } else {
      synths[currentSynth].off(halfStepNum);
    }
  }

  requestAnimationFrame(step);
}
step();

// DRUMS
