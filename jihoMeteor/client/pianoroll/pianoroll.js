
pianoOn = false;

keys = {};
offlineKeys = {};
onlineKeys = {};

voicePool = [];
voices = {};

sequencer = null;
scrubber = null;

otherInstruments = null;

var noteWidth = 0.00390625;


class StepSequencer {
  constructor() {

    sequencer = this;

    this.keyHeads = {};

    var dom = $("#synth-sequencer");
    var keyHead = $(".key-head", dom);
    var keyBody = $(".keys-body", dom);
    var keyUser = this.keyUser = $(".keys-user", dom);
    var scrubber = this.scrubber = $(".keys-scrubber-line", dom);

    dom.contextmenu((e) => {
      e.preventDefault();
    })

    for (var i = 0; i < 88; i++) {
      var key = $("<div class='key-label'></div>");
      var norm = i % 12;
      if (norm == 1 || norm == 3 || norm == 5 || norm == 8 || norm == 10) {
        key.addClass("key-black");
      } else {
        key.addClass("key-white");
      }
      keyHead.append(key);

      this.keyHeads[48-i] = key;

      var row = $("<div class='key-row'></div>");
      keyBody.append(row);
    }

    dom.scrollTop(706);

  }
  destroy() {

  }
}

class Scrubber {
  constructor(sequencer) {

    scrubber = this;
    this.sequencer = sequencer;

    var dom = this.dom = $("#scrubber");
    var line = this.line = $(".scrubber-line", dom);

    this._keydown = (e) => {
      if (e.which == 32) {
        if (this.playing) {
          this.pause();
        } else {
          this.play();
        }
        e.preventDefault();
      }
    };
    $(document.body).keydown(this._keydown);

    dom.mousedown((e) => {
      this.dragging = true;

      var left = dom.offset().left;
      var pos = e.clientX - left;
      var time = pos / dom.width();

      this.silence();
      this.setTime(time);

      if (this.playing) {
        this.startTime = this.currentTime() - (time*this.duration);
      }

      line.css({"left": pos});
    });

    this._mouseup = (e) => {
      if (this.dragging) {
        this.dragging = false;
      }

      if (this.draggingNote) {
        this.draggingNote = null;
      }
    };
    $(document.body).mouseup(this._mouseup);

    this._mousemove = (e) => {
      if (this.dragging) {
        var left = dom.offset().left;
        var pos = e.clientX - left;
        var time = pos / dom.width();

        this.silence();
        this.setTime(time);

        if (this.playing) {
          this.startTime = this.currentTime() - (time*this.duration);
        }
      } else if (this.draggingNote) {

        var idx = this.notes.indexOf(this.draggingNote);

        var note = this.draggingNote;
        var noteDom = $(this.notesDom[idx]);

        var diff = (e.clientX - this.draggingNoteStartX)/1600;

        // this.draggingNoteStartX = e.clientX;

        note.timeStart = Math.floor((this.draggingNoteStartTime + diff)/noteWidth)*noteWidth;
        note.timeEnd = note.timeStart + this.draggingNoteStartWidth;

        note.note = this.draggingNoteStartPitch - Math.floor((e.clientY - this.draggingNoteStartY)/20)

        noteDom.css({
          "top": ((48 - note.note) * 20) + "px",
          "left": note.timeStart * 1600 + "px",
          "width": (note.timeEnd - note.timeStart)*1600 + "px"
        });

        console.log(this.draggingNote);
      }
    }
    $(document.body).mousemove(this._mousemove);

    this.destroyed = false;
    this.recording = false;
    this.playing = false;
    this.setTime(0);

    this.tempo = 130;
    this.duration = (4 * 4) / this.tempo * 60 * 1000;

    this.notes = [];
    this.notesDom = [];
    this.otherInstruments = otherInstruments;

    console.log(this.notes);

    this.recordingKeys = {};

    this.tick();
  }

  loadOtherInstruments(otherInstruments) {
    this.otherInstruments = otherInstruments;
  }

  destroy() {
    this.destroyed = true;
    $(document.body).unbind("mouseup", this._mouseup);
    $(document.body).unbind("mousemove", this._mousemove);
  }

  currentTime() {
    return (new Date()).getTime();
  }

  tick() {
    if (this.destroyed) {
      return;
    }

    if (this.playing) {
      var currentTime = this.currentTime() - this.startTime;
      var normTime = currentTime/this.duration;

      // loop
      if (normTime > 1) {
        this.silence();

        currentTime = currentTime % this.duration;
        this.startTime = this.currentTime() - currentTime;

        // start all starting notes
        for (var note of this.notes) {
          if (note.timeStart == 0) {
            synths[currentSynth].on(note.note);
          }
        }
      }
      this.setTime(normTime);

      for (var note of this.notes) {
        var normStart = note.timeStart * this.duration;
        var normEnd = note.timeEnd * this.duration;
        if (this.lastTime <= normStart && normStart < currentTime) {
          synths[currentSynth].on(note.note);
        }
        if (this.lastTime <= normEnd && normEnd < currentTime) {
          synths[currentSynth].off(note.note);
        }
      }

      if (this.otherInstruments)
        for (var instr of this.otherInstruments) {
          var instFull = instr.content[0];

          var i = 0;
          if (instFull.instrument == "Drums") {
            i = 0;
          } else if (instFull.instrument == "Synth") {
            i = 1;
          } else if (instFull.instrument == "Bass") {
            i = 2;
          }

          for (var note of instFull.notes) {
            var normStart = note.timeStart * this.duration;
            var normEnd = note.timeEnd * this.duration;
            if (this.lastTime <= normStart && normStart < currentTime) {
              synths[i].on(note.note);
            }
            if (this.lastTime <= normEnd && normEnd < currentTime) {
              synths[i].off(note.note);
            }
          }
        }

      this.lastTime = currentTime;

      if (this.recording) {
        for (var halfStep in offlineKeys) {
          if (offlineKeys[halfStep] && !this.recordingKeys[halfStep]) {
            this.recordingKeys[halfStep] = {
              note: halfStep,
              timeStart: normTime,
              timeEnd: 0
            };
          } else if (!offlineKeys[halfStep] && this.recordingKeys[halfStep]) {
            this.recordingKeys[halfStep].timeEnd = normTime;

            if (this.recordingKeys[halfStep].timeEnd > this.recordingKeys[halfStep].timeStart) {

              this.notes.push(this.recordingKeys[halfStep]);
              this.createNoteDOM(this.recordingKeys[halfStep]);

            }

            this.recordingKeys[halfStep] = undefined;
            delete this.recordingKeys[halfStep];
          }
        }
      }
    }

    requestAnimationFrame(this.tick.bind(this));
  }

  createNoteDOM(note) {
    var noteDom = $("<div class='note'></div>");

    noteDom.mousedown((e) => {
      if (e.which == 3) {
        var idx = this.notes.indexOf(note);
        this.notes.splice(idx, 1);
        this.notesDom.splice(idx, 1);

        noteDom.remove();

        e.preventDefault();
        return;
      }

      this.draggingNote = note;
      this.draggingNoteStartX = e.clientX;
      this.draggingNoteStartY = e.clientY;
      this.draggingNoteStartTime = note.timeStart;
      this.draggingNoteStartWidth = note.timeEnd - note.timeStart;
      this.draggingNoteStartPitch = note.note;
      e.preventDefault();
    });

    noteDom.css({
      "top": ((48 - note.note) * 20) + "px",
      "left": note.timeStart * 1600 + "px",
      "width": (note.timeEnd - note.timeStart)*1600 + "px"
    });

    this.notesDom.push(noteDom[0]);

    this.sequencer.keyUser.append(noteDom);
  }

  silence() {
    for (var halfStep in onlineKeys) {
      onlineKeys[halfStep] = false;
      delete onlineKeys[halfStep];
    }

    for (var synth of synths) {
      synth.silence();
    }
  }

  play() {
    this.recordingKeys = {};
    this.playing = true;
    this.startTime = this.currentTime() - this.time * this.duration;
    this.lastTime = this.startTime;
    this.silence();

    for (var note of this.notes) {
      if (note.timeStart == 0) {
        onlineKeys[note.note] = true;
      }
    }

  }

  pause() {
    this.playing = false;
    this.silence();
  }

  record() {
    this.recording = true;
  }

  stopRecord() {
    this.recording = false;
  }

  // onChangeTime(cb) {
  //   this.cb = cb;
  // }

  setTime(time) {
    if (time > 1) time = 1;
    if (time < 0) time = 0;
    this.time = time;
    this.line.css({"left": time * this.dom.width()});

    this.sequencer.scrubber.css({"left": (time * 1600) + "px"});
  }
}


Template.piano.onRendered(function(){

  var sequencer = new StepSequencer();
  var scrubber = new Scrubber(sequencer);

  $("#play").click((e) => {
    if (scrubber.playing) {
      scrubber.pause();
    } else {
      scrubber.play();
    }
    e.preventDefault();
  })

  $("#record").click((e) => {
    console.log("hey!");
    if (scrubber.recording) {
      scrubber.stopRecord();
      $("#record").css({"color": "black", "fontWeight": "normal"});
    } else {
      scrubber.record();
      $("#record").css({"color": "red", "fontWeight": "bold"});
    }
  })

  this.sequencer = sequencer;
  this.scrubber = scrubber;

  pianoOn = true;

})

Template.piano.onDestroyed(function() {
  this.sequencer.destroy();
  this.scrubber.destroy();

  pianoOn = false;

})