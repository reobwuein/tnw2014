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

  var currentUser = {};
  var playList;
  var playListURI;
  var list;
  currentUser.library = library.Library.forCurrentUser();
  
  currentUser.library.playlists.snapshot().done(function(result){
    var found = false;

    for(var i = 0, l =result._meta.length; i<l; i++){

      if(result._meta[i].name === "MxR"){
        found = true;
        playListURI = result._uris[i];
        break;
      }
    }

    if(!found){
      models.Playlist.create("MxR").done(function(result){
        playList = result;
        buildList();
      })
    }else{
      playList = models.Playlist.fromURI(playListURI)
      buildList();
    }
  })

  var draging,
      mouseBase,
      dragingBase;

  positionSongs();
  addDragingSong();

  function buildList(){
      list = List.forPlaylist(playList);
      document.getElementById('playlistContainer').appendChild(list.node);
      list.init();
  }

  function startDragingSong(event){
    var song = document.querySelectorAll('#mixer .song');
    for(var i in song){
      if(i !== "length" && i !== "item"){
        song[i].removeEventListener("mousedown", startDragingSong, false);
      }
    }

    document.addEventListener("mouseup", stopDragingSong, false);
    document.addEventListener("mousemove", onDragingSong, false);
    removeDragingSong();

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
  function checkRearange(element, leftPosition){

  }

  function onDragingSong(event){
    var song = document.querySelectorAll('#mixer .track'),
        newLeft;

    for(var i in song){
      if(i !== "length" && i !== "item"){
        song[i].addEventListener("mousedown", startDragingSong, false);
      }
    }

    newLeft = dragingBase.x + (event.pageX - mouseBase.x) ;
    newLeft = newLeft > 0 ? newLeft : 0;
    draging.style.left = newLeft + "px";
  }

  function stopDragingSong(event){
    document.removeEventListener("mouseup", stopDragingSong, false);
    document.removeEventListener("mousemove", onDragingSong, false);
    addDragingSong();
  }

  function addDragingSong(){
    var song = document.querySelectorAll('#mixer .song');
    for(var i in song){
      if(i !== "length" && i !== "item"){
        song[i].addEventListener("mousedown", startDragingSong, false);
      }
    }
  }

  function removeDragingSong(){
    var song = document.querySelectorAll('#mixer .song');
    for(var i in song){
      if(i !== "length" && i !== "item"){
        song[i].removeEventListener("mousedown", startDragingSong, false);
      }
    }
  }

  function positionSongs(){
    var width = 0;
    var song = document.querySelectorAll('#mixer .song');
    for(var i in song){
      if(i !== "length" && i !== "item"){
        song[i].style.left = width + "px";
        width += song[i].offsetWidth;
      }
    }
  }
});
