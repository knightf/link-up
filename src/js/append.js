var logger = require('./logger.js');

function getPathLayer(p) {
  var toP = p[0][1], righT = p[0][0], bottoM = p[0][1], lefT = p[0][0];
  p.forEach(function(point) {
    if (point[0] < lefT) {
      lefT = point[0];
    } else if (point[0] > righT) {
      righT = point[0];
    }

    if (point[1] < toP) {
      toP = point[1];
    } else if (point[1] > bottoM) {
      bottoM = point[1];
    }
  });

  var rectWidth = righT - lefT > 0 ? righT - lefT : 1;
  var rectHeight = bottoM - toP > 0 ? bottoM - toP : 1;
  var nsRect = NSMakeRect(lefT, toP, rectWidth, rectHeight);

  var cPoints = p.map(function(point) {
    return [(point[0] - lefT) / rectWidth, (point[1] - toP) / rectHeight];
  }).map(function(point) {
    return CGPointMake(point[0], point[1]);
  }).map(function(cg) {
    return MSCurvePoint.pointWithPoint(cg);
  });

  var path = MSShapePath.pathWithPoints(cPoints);
  var pathLayer = MSShapePathLayer.shapeWithShapePath_inRect_(path, nsRect);
  
  return pathLayer;
}

function getShapeGroup(p) {
  var pathLayer = getPathLayer(p);
  var shapeGroup = MSShapeGroup.shapeWithPath_(pathLayer);

  // set border
  var layerStyle = shapeGroup.style();
  layerStyle.addStylePartOfType(1);
  var borderStyle = layerStyle.borders().firstObject();
  borderStyle.setThickness(2);
  var rgb = [];
  for(var i = 0; i < 3; i++) rgb.push(Math.random() / 2);
  borderStyle.setColor(MSColor.colorWithRed_green_blue_alpha_(rgb[0], rgb[1], rgb[2], 0.5));
  
  // set decoration
  pathLayer.setStartDecorationType(3);
  pathLayer.setEndDecorationType(1);
  return shapeGroup;
}

function append(context, points, layers) {
  var shapeGroup = getShapeGroup(points);
  shapeGroup.setName('Link from [' + layers.startLayer.name().toString() + '] to [' + layers.endLayer.name().toString() + ']');

  var page = context.document.currentPage();
  page.addLayers([shapeGroup]);
}

module.exports = append;

