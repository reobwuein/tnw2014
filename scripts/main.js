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

      if(result._meta[i].name === "MXR"){
        found = true;
        playListURI = result._uris[i];
        break;
      }
    }

    if(!found){
      models.Playlist.create("MXR").done(function(result){
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

  addDraging();

  function buildList(){
      list = List.forPlaylist(playList);
      document.getElementById('playlistContainer').appendChild(list.node);
      list.init();
  }

  function startDraging(event){
    document.addEventListener("mouseup", stopDraging, false);
    document.addEventListener("mousemove", onDraging, false);
    document.querySelector('.song').removeEventListener("mousedown", startDraging);

    draging = event.target;
    mouseBase = {
      x: event.pageX,
      y: event.pageY
    }
    dragingBase = {
      x: draging.style.left,
      y: draging.style.top
    }
  }

  function onDraging(event){
    draging.style.left = dragingBase.x + (event.pageX - mouseBase.x) + "px";
  }

  function stopDraging(event){
    document.removeEventListener("mouseup", stopDraging);
    document.removeEventListener("mousemove", onDraging, false);
    addDraging();
  }

  function addDraging(){
    document.querySelector('.song').addEventListener("mousedown", startDraging, false);
  }
});
