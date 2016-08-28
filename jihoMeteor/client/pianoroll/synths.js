
currentSynth = 0;
synths = [];

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
    onlineKeys[halfStep + octave*12] = true;
    offlineKeys[halfStep + octave*12] = true;
    sequencer.keyHeads[halfStep + octave*12].addClass("key-highlight");
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
    // primus.write({halfStep: halfStep + octave*12, state: false});
    onlineKeys[halfStep + octave*12] = false;
    offlineKeys[halfStep + octave*12] = false;
    sequencer.keyHeads[halfStep + octave*12].removeClass("key-highlight");
  }
});


function freq(halfStep) {

  return Math.floor(Math.pow(Math.pow(2, 1/12), halfStep) * 220);
}

var context = new (window.AudioContext || window.webkitAudioContext)();

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
    this.oscillator.type = 'sawtooth';
    this.oscillator.frequency.value = 440;
    this.oscillator.detune.value = 0;
    this.oscillator.connect(this.gainNode);
    this.start();

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

    this.setFreq(freq(halfStep - 10 + offset));
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

    this.oscillator.type = 'sawtooth';
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
      if (voicePool.length > 0) {
        voice = voicePool.pop();
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

      voicePool.push(this.voices[halfStep]);
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
    super();
    this.Voice = BassVoice;
  }
}

synths.push(new Synth());
synths.push(new BassSynth());
synths.push(new DrumSynth());

function step() {

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
