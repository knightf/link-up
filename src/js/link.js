var PF = require('pathfinding');

var logger = require('./logger.js');
var util = require('./utils.js');
var appendPath = require('./append.js'); 

function endPointsCalc(c, l) {
  var startCenter = util.getLayerCenter(l.startLayer);
  var endCenter = util.getLayerCenter(l.endLayer);
  logger.log('start (' + startCenter.x + ',' + startCenter.y + '), end(' + endCenter.x + ',' + endCenter.y + ')');

  var vector = [endCenter.x - startCenter.x, startCenter.y - endCenter.y]
  var vectorAngleDeg = Math.atan2(vector[1], vector[0]) * 180 / Math.PI;
  logger.log('vector degree: ' + vectorAngleDeg);

  if (vectorAngleDeg > -135 && vectorAngleDeg <= -45) {
    return {
      start: 2,
      end: 0,
    };
  } else if (vectorAngleDeg > -45 && vectorAngleDeg <= 45) {
    return {
      start: 1,
      end: 3,
    };
  } else if (vectorAngleDeg > 45 && vectorAngleDeg <= 135) {
    return {
      start: 0,
      end: 2,
    };
  } else {
    return {
      start: 3,
      end: 1
    };
  }
}

function buildRawMatrix(context, layers) {
  var artboards = context.document.currentPage().artboards();
  logger.log('artboards total number: ' + artboards.count());

  var possibleX = {};
  var possibleY = {};
  for (var i = 0; i < artboards.count(); i++) {
    var currArtboard = artboards[i];
    var currX = currArtboard.frame().x();
    var currY = currArtboard.frame().y();
    if (currX in possibleX){
      possibleX[currX].push(currArtboard);
    } else {
      possibleX[currX] = [currArtboard];
    }
    if (currY in possibleY) {
      possibleY[currY].push(currArtboard);
    } else {
      possibleY[currY] = [currArtboard];
    }
  }

  var ascSort = function(a, b) { return a - b; }
  var sortedRowsPositions = Object.keys(possibleY).sort(ascSort);
  var sortedColsPositions = Object.keys(possibleX).sort(ascSort);
  var rowsCount = sortedRowsPositions.length;
  var colsCount = sortedColsPositions.length;
  logger.log('Slots: ' + (rowsCount * colsCount));

  var rawMatrix = [];
  for (i = 0; i < rowsCount; i++) {
    var currRow = [];
    for (var j = 0; j < colsCount; j++) {
      var currSlotX = sortedColsPositions[j];
      var currSlotXBoards = possibleX[currSlotX];
      var currSlotXBoardsCount = currSlotXBoards.length;
      var currSlotY = sortedRowsPositions[i];
      var currSlotYBoards = possibleY[currSlotY];
      var currSlotYBoardsCount = currSlotYBoards.length;

      // calc intersaction
      var slotTarget = null;
      if (currSlotXBoardsCount != 0 && currSlotYBoardsCount != 0) {
        var shorterOne = currSlotXBoardsCount < currSlotYBoardsCount ? currSlotXBoards : currSlotYBoards;
        var longerOne = shorterOne == currSlotXBoards ? currSlotYBoards : currSlotXBoards;
        for (var k = 0; k < shorterOne.length; k++) {
          var currBoard = shorterOne[k];
          if (longerOne.indexOf(currBoard) > -1) {
            slotTarget = currBoard;
            break;
          }
        }
      }
      currRow.push(slotTarget);
    } 
    rawMatrix.push(currRow);
  };

  return rawMatrix;
}

function getPointWithPositionIndex(x, y, p) {
  switch(p) {
    case 0: {
      return {
        x: x,
        y: y - 1,
      };
    }
    case 1: {
      return {
        x: x + 1,
        y: y,
      };
    }
    case 2: {
      return {
        x: x,
        y: y + 1,
      };
    }
    default: {
      return {
        x: x - 1,
        y: y,
      };
    }
  }
}

function getFirstLayerInOneCol(index, matrix) {
  var width = matrix[0].length;
  var height = matrix.length;
  if (index < 0 || index >= width) return null;
  for (var i = 0; i < height; i++) {
    var currUnit = matrix[i][index];
    if (currUnit) return currUnit.ref;
  }
  return null;
}

function getFirstLayerInOneRow(index, matrix) {
  var width = matrix[0].length;
  var height = matrix.length;
  if (index < 0 || index >= height) return null;
  for (var i = 0; i < width; i++) {
    var currUnit = matrix[index][i];
    if (currUnit) return currUnit.ref;
  }
  return null;
}

function getRefPackage(m, l, p) {
  var rawMatrixWidth = m[0].length;
  var rawMatrixHeight = m.length;
  var refMatrixWidth = rawMatrixWidth * 2 + 1;
  var refMatrixHeight = rawMatrixHeight * 2 + 1;

  var refMatrix = [];
  for(var i = 0; i < refMatrixHeight; i++) {
    var row = [];
    for(var j = 0; j < refMatrixWidth; j++) {
      row.push(null);
    }
    refMatrix.push(row);
  }

  var pathMatrix = new PF.Grid(refMatrixWidth, refMatrixHeight);
  var startPoint, endPoint;

  for(i = 0; i < rawMatrixHeight; i++) {
    for(j = 0; j < rawMatrixWidth; j++) {
      var currArtboard = m[i][j];
      if (!currArtboard) continue;

      var currRefX = 2 * j + 1;
      var currRefY = 2 * i + 1;
      // center, set unwalkable
      pathMatrix.setWalkableAt(currRefX, currRefY);
      // put board ref in matrix
      refMatrix[currRefY][currRefX] = {
        type: 'layer',
        ref: currArtboard,
      };

      if (currArtboard == l.startLayer) {
        startPoint = getPointWithPositionIndex(currRefX, currRefY, p.start);
      }

      if (currArtboard == l.endLayer) {
        endPoint = getPointWithPositionIndex(currRefX, currRefY, p.end);
      }
    }
  }

  var refXs = [];
  var refYs = [];

  for (i = 1; i < refMatrixWidth; i++) {
    // find first layer to left
    var leftLayer = getFirstLayerInOneCol(i - 1, refMatrix);
    if (leftLayer) {
      var leftLayerFrame = leftLayer.frame();      
      refXs.push(leftLayerFrame.x() + leftLayerFrame.width());
      continue;
    }

    // no luck, find layer this col
    var colLayer = getFirstLayerInOneCol(i, refMatrix);
    if (colLayer) {
      var colLayerFrame = colLayer.frame();
      refXs.push(colLayerFrame.x());
      continue; 
    }
    
    throw new Error('Matrix error! (x)');
    return false;
  }

  refXs.push(refXs[refXs.length - 1] + 100);
  refXs.unshift(refXs[0] - 100);

  for (i = 1; i < refMatrixHeight; i++) {
    // find first layer to top
    var toplayer = getFirstLayerInOneRow(i - 1, refMatrix);
    if (toplayer) {
      var topLayerFrame = toplayer.frame();
      refYs.push(topLayerFrame.y() + topLayerFrame.height());
      continue;
    }

    // no luck, find layer this row
    var rowLayer = getFirstLayerInOneRow(i, refMatrix);
    if (rowLayer) {
      var rowLayerFrame = rowLayer.frame();
      refYs.push(rowLayerFrame.y());
      continue;
    }
    
    throw new Error('Matrix error! (y)');
    return false;
  }

  refYs.push(refYs[refYs.length - 1] + 100);
  refYs.unshift(refYs[0] - 100);

  return {
    refMatrix: refMatrix,
    grid: pathMatrix,
    pathStart: startPoint,
    pathEnd: endPoint,
    refXs: refXs,
    refYs: refYs,
  };
}

function getLayerBoundryAbsolutePosition(layer, p) {
  var frame = layer.frame();
  if (p == 0) {
    return [parseInt((frame.x() + frame.width() / 2), 10), frame.y()];
  } else if (p == 1) {
    return [frame.x() + frame.width(), parseInt(frame.y() + frame.height() / 2, 10)];
  } else if (p == 2) {
    return [parseInt((frame.x() + frame.width() / 2), 10), frame.y() + frame.height()];
  } else {
    return [frame.x(), parseInt(frame.y() + frame.height() / 2, 10)];
  }
}

function calcAbsolutePoints(context, layers, isDirect) {
  var rawMatrix = buildRawMatrix(context, layers);

  var endPoints = endPointsCalc(context, layers);
  logger.log('End points ' + endPoints.start + ' to ' + endPoints.end); 

  if (isDirect) {
    var startPoint = getLayerBoundryAbsolutePosition(layers.startLayer, endPoints.start);
    var endPoint = getLayerBoundryAbsolutePosition(layers.endLayer, endPoints.end);
    
    var resultList = [startPoint];
    var isEscape = startPoint[0] == endPoint[0] || startPoint[1] == endPoint[1];
    if (!isEscape) {
      if ((endPoints.start + endPoints.end) == 2) {
        var centerY = parseInt((startPoint[1] + endPoint[1]) / 2);
        resultList.push([startPoint[0], centerY]);
        resultList.push([endPoint[0], centerY]);
      } else {
        var centerX = parseInt((startPoint[0] + endPoint[0]) / 2);
        resultList.push([centerX, startPoint[1]]);
        resultList.push([centerX, endPoint[1]]);
      }
    }
    resultList.push(endPoint);
    return resultList;
  } else {
    var refPackage = getRefPackage(rawMatrix, layers, endPoints);
    logger.log('(' + refPackage.pathStart.x + ',' + refPackage.pathStart.y + ') (' + refPackage.pathEnd.x + ',' + refPackage.pathEnd.y + ')');

    var finder = new PF.JumpPointFinder({
      heuristic: PF.Heuristic.manhattan,
      diagonalMovement: PF.DiagonalMovement.Never
    });

    var pathNodes;
    if (refPackage.pathStart.x == refPackage.pathEnd.x && refPackage.pathStart.y == refPackage.pathEnd.y) {
      pathNodes = [[refPackage.pathStart.x, refPackage.pathStart.y]];
    } else {
      var pathInGrid = finder.findPath(refPackage.pathStart.x, refPackage.pathStart.y, refPackage.pathEnd.x, refPackage.pathEnd.y, refPackage.grid);
      pathNodes = PF.Util.compressPath(pathInGrid);
    }
    
    var absolutePoints = pathNodes.map(function(node){
      var x = node[0], y = node[1];
      var centerX = parseInt((refPackage.refXs[x] + refPackage.refXs[x + 1]) / 2);
      var centerY = parseInt((refPackage.refYs[y] + refPackage.refYs[y + 1]) / 2);
      return [centerX, centerY];
    });

    // absolute, start
    absolutePoints.unshift(getLayerBoundryAbsolutePosition(layers.startLayer, endPoints.start));
    // absolute, end
    absolutePoints.push(getLayerBoundryAbsolutePosition(layers.endLayer, endPoints.end));
   
    return absolutePoints;
  }
}

function link(isDirect, context) {
  var layers = util.analyzeSelection(context);
  logger.log('Layers analyzed.');
  
  var absolutePoints = calcAbsolutePoints(context, layers, isDirect);  
  var nodeListString = absolutePoints.reduce(function(str, node) {
    str += '(' + node[0] + ', ' + node[1] + ') ';
    return str;
  }, 'Path: ');
  logger.log(nodeListString);

  appendPath(context, absolutePoints, layers);
}

module.exports = link;

