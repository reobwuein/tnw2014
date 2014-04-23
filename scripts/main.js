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


  function addToQueue(event){
    console.log(event);
  }

  function buildLibrary(){

    Library.load('tracks').done(function(result){

      result.tracks.snapshot().done(function(result){
        
        var library = document.querySelector('#library');

        library.innerHTML = "";

        for(var i = 0, l =result._meta.length; i<l; i++){        

          library.innerHTML += "<li><a href='"+result._uris[i]+"' onclick='addToQueue' >add to queue</a>"+result._meta[i].name+"<span>"+result._meta[i].artists[0].name+"</span></li>"
           
        }
      })
    });
  }

/* Timeline */

  var draging,
      mouseBase,
      dragingBase,
      fullWidthEqualMiliseconds = 1800000,
      songElements = document.querySelectorAll('#mixer .song');

  scaleSong(songElements[1], 240000, 60000, 60000);
  positionSongs();
  addDragingSong();


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
    draging.className = "song selected";

    mouseBase = {
      x: event.pageX,
      y: event.pageY
    };

    dragingBase = {
      x: draging.offsetLeft,
      y: draging.offsetTop
    };
  }

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
      if(after == songElements.length){
        parent.appendChild(element);
      }else{
        parent.insertBefore(element, songElements[after+1]);
      }
    }else{
      parent.insertBefore(element, songElements[Math.min(moveTo)])
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
    var width = 0;

    for(var i in songElements){
      if(i !== "length" && i !== "item"){
        songElements[i].style.left = width + "px";
        width += songElements[i].offsetWidth;
      }
    }
  }

  function scaleSong(element, songLengthMiliseconds, introCropMiliseconds, outroCropMiliseconds){

    element.style.width = ( songLengthMiliseconds - introCropMiliseconds - outroCropMiliseconds ) / fullWidthEqualMiliseconds * 100 + "%";
    element.querySelector('.before').style.width = introCropMiliseconds / songLengthMiliseconds * 100 + "%";
    element.querySelector('.after').style.width = outroCropMiliseconds / songLengthMiliseconds * 100 + "%";
  } 


});
