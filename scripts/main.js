Array.prototype.move = function (old_index, new_index) {
    while (old_index < 0) {
        old_index += this.length;
    }
    while (new_index < 0) {
        new_index += this.length;
    }
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};

require([
  '$api/models',
  '$api/library',
  '$views/list#List'
], function(models, library, List) {
  'use strict';


  models.application.addEventListener('arguments', function() {
      models.application.load('arguments').done(function (args) {
        console.log(args);
     });
  });

  function echonestTrackDataURL(artist, track){
    return "http://developer.echonest.com/api/v4/song/search?api_key=V0UUZ2B2WYJMAVDY6&format=json&results=1&artist="+encodeURI(artist)+"&title="+encodeURI(track)+"&bucket=audio_summary";
  }

/* Library List */

  var currentUser = {};
  var Library;
  var LibraryURI;
  var list;
  var queue = [];

  var draging,
      mouseBase,
      dragingBase,
      fullWidthEqualMiliseconds = 1800000,
      selectedSong,
      nowPlayingId,
      songElements = document.querySelectorAll('#mixer .song');

  currentUser.library = library.Library.forCurrentUser();
  
  currentUser.library.playlists.snapshot().done(function(result){
    var found = false;

    for(var i = 0, l =result._meta.length; i<l; i++){

      if(result._meta[i].name === "MxR library"){
        found = true;
        LibraryURI = result._uris[i];
        break;
      }
    }

    if(!found){
      models.Playlist.create("MxR library").done(function(result){
        Library = result;
        buildList('library-container');
      })
    }else{
      Library = models.Playlist.fromURI(LibraryURI);
      Library.addEventListener("insert", buildLibrary);
      Library.addEventListener("remove", buildLibrary);
      buildLibrary();
    }
  })

  function playNext(event){
    if(queue[nowPlayingId+1]){
      models.player.playTrack(models.Track.fromURI(queue[nowPlayingId+1].data.uri));
      models.player.seek(queue[nowPlayingId+1].intro)
      console.log(queue[nowPlayingId+1].duration - queue[nowPlayingId+1].outro - queue[nowPlayingId+1].intro)
      setTimeout(playNext, queue[nowPlayingId+1].duration - queue[nowPlayingId+1].outro - queue[nowPlayingId+1].intro);
      nowPlayingId += 1;
    }else{
      models.player.pause();
    }
  }

  function startPlayingQueue(event){
    nowPlayingId = -1;
    playNext()
  }
  document.querySelector('.play').addEventListener("click", startPlayingQueue, false);

  function addToQueue(event){
    models.Track.fromURI(event.target.dataset.track).load('name').done(function(track) {
      var newTrack = {
          "name": track.name,
          "duration": track.duration,
          "intro": 0,
          "outro": 0,
          "data": track
      }
      queue.push(newTrack);

      addTrackToTimeLine(newTrack);
      songElements = document.querySelectorAll('#mixer .song');
      positionSongs();
      addDragingSong();
    });
  }

  function updateQueue(from, to){
    console.log(from, to)
    console.log("pre",queue);
    queue.move(from, to);
    console.log("post",queue);
  }

  function buildLibrary(){

    Library.load('tracks').done(function(result){

      result.tracks.snapshot().done(function(result){
        
        var library = document.querySelector('#library');

        library.innerHTML = "";

        for(var i = 0, l =result._meta.length; i<l; i++){        

          var li = document.createElement('li');
          var addLink = document.createElement('a');
          var artistsForTrack = document.createElement('span');
          var artists = false;
          addLink.setAttribute("data-track",result._uris[i]);
          addLink.setAttribute("href",'#');
          addLink.innerHTML = result._meta[i].name;
          for(var ii in result._meta[i].artists){
            artistsForTrack.innerHTML += ii > 0 ? ", " + result._meta[i].artists[ii].name : result._meta[i].artists[ii].name;
          }
          addLink.addEventListener("click", addToQueue, false);
          
          //addLink.appendChild(artistsForTrack);
          li.appendChild(addLink);
          library.appendChild(li);           
        }
      })
    });
  }

/* Timeline */

  function startDragingSong(event){
    for(var i in songElements){
      if(i !== "length" && i !== "item"){
        songElements[i].className = "song";
      }
    }

    document.addEventListener("mouseup", stopDragingSong, false);
    document.addEventListener("mousemove", onDragingSong, false);
    removeDragingSong();

    draging = event.target;
    selectSong(draging);

    mouseBase = {
      x: event.pageX,
      y: event.pageY
    };

    dragingBase = {
      x: draging.offsetLeft,
      y: draging.offsetTop
    };
  }

  function selectSong(song){
    var cropper = document.querySelector('#cropper');
    cropper.className = "";
    song.className = "song selected";
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("change", false, true);
    for(var i in songElements){
      if(song === songElements[i]){
        selectedSong = queue[i];

        document.querySelector('h2').innerHTML = queue[i].name ;

        var introField = cropper.querySelector('.intro-ms');
        introField.addEventListener("change", textFieldUpdateScrubber, false);
        introField.value = queue[i].intro;
        introField.dispatchEvent(evt);

        var outroField = cropper.querySelector('.outro-ms');
        outroField.addEventListener("change", textFieldUpdateScrubber, false);
        outroField.value = queue[i].outro;
        outroField.dispatchEvent(evt);

        var introScrubber = cropper.querySelector('.intro-trimmer');
        introScrubber.addEventListener("mouseDown", startScrubbing, false);
        var outroScrubber = cropper.querySelector('.outro-trimmer');
        outroScrubber.addEventListener("mouseDown", startScrubbing, false);
      }
    }
  };

  function startScrubbing(event){
    document.addEventListener("mouseup", stopScrubbing, false);
    document.addEventListener("mousemove", onScrubbing, false);

    removeDragingScrubber();

    draging = event.target;

    mouseBase = {
      x: event.pageX,
      y: event.pageY
    };

    dragingBase = {
      x: draging.offsetLeft,
      y: draging.offsetTop
    };

  }

  function onScrubbing(event){
    var newLeft = dragingBase.x + ((event.pageX - mouseBase.x));
    draging.style.marginLeft = ((newLeft - dragingBase.x) / 3 ) + "px";
  }

  function removeDragingScrubber(){

  };

  function stopScrubbing(){

  };

  function textFieldUpdateScrubber(event){
    var cropper = document.querySelector('#cropper');
    if(event.target.className == 'intro-ms'){
      selectedSong.intro = event.target.value;
      cropper.querySelector('.intro-trimmer').style.left = selectedSong.intro / selectedSong.duration * 100 + "%"
    }else{
      selectedSong.outro = event.target.value;
      cropper.querySelector('.outro-trimmer').style.right = selectedSong.outro / selectedSong.duration * 100 + "%"
    }
    scaleSong(document.querySelector(".song.selected"), selectedSong.duration, selectedSong.intro, selectedSong.outro);
    positionSongs();
  };

  function scrubberUpdateTextField(event){
    var cropper = document.querySelector('#cropper');
    if(event.target.className == 'intro-trimmer'){
      selectedSong.intro = cropper.querySelector('intro-ms').style.left / 100 *  selectedSong.duration;
      cropper.querySelector('intro-ms').value = selectedSong.intro;
    }else{
      selectedSong.outro = cropper.querySelector('outro-ms').style.right / 100 *  selectedSong.duration;
      cropper.querySelector('outro-ms').value = selectedSong.outro;
    }
    scaleSong(document.querySelector(".song.selected"), selectedSong.duration, selectedSong.intro, selectedSong.outro);
    positionSongs();
  };

  function checkRearange(element, leftPosition){
    var found = false,
        rearange = false;

    for(var i in songElements){
      if(songElements[i] == element){
        found = true;
      }else{
        if (found == false) {
          rearange = songElements[i].offsetLeft > leftPosition;

        }else{
          rearange = songElements[i].offsetLeft < leftPosition;
        };
      };
      if(rearange) return true;
    };
    return false;
  };

  function rearange(element, leftPosition){
    var found = false,
        foundAt = false,
        up = true,
        moveTo = [],
        parent = document.querySelector('#mixer .songs');

    for(var i in songElements){
      if(songElements[i] == element){
        found = true;
        foundAt = i;
      }else{
        if (found == false) {
          if(songElements[i].offsetLeft > leftPosition){
            moveTo.push(i);
            up = false;
          }
        }else{
          if(songElements[i].offsetLeft + songElements[i].offsetWidth < leftPosition + element.offsetWidth)
          moveTo.push(i);
        };
      };
    };
    if(up){
      var after = Math.max(moveTo);
      if(after == songElements.length-1){
        parent.appendChild(element);
        updateQueue(foundAt, songElements.length-1);
        console.log("forward last")
      }else{
        parent.insertBefore(element, songElements[after+1]);
        console.log("forward");
        updateQueue(foundAt, after);
      }
    }else{
      parent.insertBefore(element, songElements[Math.min(moveTo)]);
        console.log("backward");
      updateQueue(foundAt, Math.min(moveTo));
    };
  };

  function onDragingSong(event){
    var newLeft = dragingBase.x + ((event.pageX - mouseBase.x)) ;

    if(checkRearange(draging, newLeft)){

      rearange(draging, newLeft);

      songElements = document.querySelectorAll('#mixer .song');
      mouseBase = {
        x: event.pageX,
        y: event.pageY
      };

      dragingBase = {
        x: newLeft,
        y: draging.offsetTop
      };

      draging.style.marginLeft = 0;

      positionSongs();

    }else{
      draging.style.marginLeft = ((newLeft - dragingBase.x) / 3 ) + "px";
    }
  }

  function stopDragingSong(event){
    document.removeEventListener("mouseup", stopDragingSong, false);
    document.removeEventListener("mousemove", onDragingSong, false);
    draging.style.marginLeft = 0+"px";
    addDragingSong();
  }

  function addDragingSong(){
    for(var i in songElements){
      if(i !== "length" && i !== "item"){
        songElements[i].addEventListener("mousedown", startDragingSong, false);
      }
    }
  }

  function removeDragingSong(){
    for(var i in songElements){
      if(i !== "length" && i !== "item"){
        songElements[i].removeEventListener("mousedown", startDragingSong, false);
      }
    }
  }

  function positionSongs(){
    var width = 20;

    for(var i in songElements){
      if(i !== "length" && i !== "item"){
        songElements[i].style.left = width + "px";
        width += songElements[i].offsetWidth;
      }
    }
  }

  function scaleSong(element, songLengthMiliseconds, introCropMiliseconds, outroCropMiliseconds){
    console.log((songLengthMiliseconds / fullWidthEqualMiliseconds) / (( songLengthMiliseconds - introCropMiliseconds - outroCropMiliseconds ) / fullWidthEqualMiliseconds));
    element.style.width = ( songLengthMiliseconds - introCropMiliseconds - outroCropMiliseconds ) / fullWidthEqualMiliseconds * 100 + "%";
    element.querySelector('.before').style.width = (introCropMiliseconds / songLengthMiliseconds) * ((songLengthMiliseconds / fullWidthEqualMiliseconds) / (( songLengthMiliseconds - introCropMiliseconds - outroCropMiliseconds ) / fullWidthEqualMiliseconds)) * 100 + "%";
    element.querySelector('.after').style.width = outroCropMiliseconds / songLengthMiliseconds  * ((songLengthMiliseconds / fullWidthEqualMiliseconds) / (( songLengthMiliseconds - introCropMiliseconds - outroCropMiliseconds ) / fullWidthEqualMiliseconds)) * 100 + "%";
  } 

  function placeQueueInTimeLine(){
    parent = document.querySelector('#mixer .songs');
    parent.innerHTML = "";
    for(var i in queue){
      var song = document.createElement('song');
      song.setAttribute("class", "song");
      song.innerHTML = '<div class="before"></div><div class="after"></div>';
      parent.appendChild(song);
      scaleSong(song, queue[i].duration, queue[i].intro, queue[i].outro);
    }
  }

  function addTrackToTimeLine(item){
    parent = document.querySelector('#mixer .songs');
    var song = document.createElement('song');
    song.setAttribute("class", "song");
    song.innerHTML = '<div class="before"></div><div class="after"></div>';
    parent.appendChild(song);
    scaleSong(song, item.duration, item.intro, item.outro);
  }
});
