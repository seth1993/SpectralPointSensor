chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    'outerBounds': {
      'width': 900,
      'height': 1000
    }//state: "fullscreen"
  });
  chrome.app.window.get('index.html').onClosed.addListener(function(){
    console.log("closed");
  })
});