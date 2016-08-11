function preReq(context) {
  var selectedLayers = context.selection;
  if (selectedLayers.count() != 2) return false;
  for (var i = 0; i < selectedLayers.count(); i++) {
    var currTarget = selectedLayers[i];
    if (currTarget.class().toString() != 'MSArtboardGroup') return false;
  }
  return true;
}

function getLayerCenter(layer) {
  var frame = layer.frame();
  var width = frame.width();
  var height = frame.height();
  var x = frame.x();
  var y = frame.y();
  return {
    x: parseInt((x + x + width) / 2),
    y: parseInt((y + y + height) / 2),
  };
}

function analyzeSelection(context) {
  var selectedLayers = context.selection;
  var a = selectedLayers[0];
  var b = selectedLayers[1];

  var startLayer = a.name().toString() > b.name().toString() ? b : a;
  var endLayer = startLayer == a ? b : a;

  return {
    startLayer: startLayer,
    endLayer: endLayer,
  };
}

module.exports = {
  preReq: preReq,
  getLayerCenter: getLayerCenter,
  analyzeSelection: analyzeSelection,
};

