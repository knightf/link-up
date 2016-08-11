/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(1);
	var logger = __webpack_require__(2);

	var linkLayers = __webpack_require__(3);

	function handler(isDirect, context) {
	  logger.setLogger(context.document.showMessage);

	  if (!util.preReq(context)) {
	    logger.info('Please select 2 artboards.');
	    return false;
	  }

	  try {
	    linkLayers(isDirect, context);
	  } catch(e) {
	    logger.log(e.message);
	  }
	}

	self.onDirectLink = function(context) {
	  handler(true, context);
	};

	self.onSmartLink = function(context) {
	  handler(false, context);
	};



/***/ },
/* 1 */
/***/ function(module, exports) {

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



/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	function logStr(str) {
	  return str;
	}

	var logger = {
	  log: function(str) {
	    if ((undefined) == 'dev'){
	      logger.logfunc(str.toString());
	    }
	  },
	  info: function(str) {
	    logger.logfunc(str.toString());
	  },
	  logfunc: logStr,
	  setLogger: function(func) {
	    logger.logfunc = func;
	  },
	};

	module.exports = logger;



/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var PF = __webpack_require__(4);

	var logger = __webpack_require__(2);
	var util = __webpack_require__(1);
	var appendPath = __webpack_require__(20); 

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



/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(5);


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	    'Grid'                      : __webpack_require__(6),
	    'Util'                      : __webpack_require__(9),
	    'DiagonalMovement'          : __webpack_require__(8),
	    'Heuristic'                 : __webpack_require__(10),
	    'JumpPointFinder'           : __webpack_require__(11),
	};


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var Node = __webpack_require__(7);
	var DiagonalMovement = __webpack_require__(8);

	/**
	 * The Grid class, which serves as the encapsulation of the layout of the nodes.
	 * @constructor
	 * @param {number|Array<Array<(number|boolean)>>} width_or_matrix Number of columns of the grid, or matrix
	 * @param {number} height Number of rows of the grid.
	 * @param {Array<Array<(number|boolean)>>} [matrix] - A 0-1 matrix
	 *     representing the walkable status of the nodes(0 or false for walkable).
	 *     If the matrix is not supplied, all the nodes will be walkable.  */
	function Grid(width_or_matrix, height, matrix) {
	    var width;

	    if (typeof width_or_matrix !== 'object') {
	        width = width_or_matrix;
	    } else {
	        height = width_or_matrix.length;
	        width = width_or_matrix[0].length;
	        matrix = width_or_matrix;
	    }

	    /**
	     * The number of columns of the grid.
	     * @type number
	     */
	    this.width = width;
	    /**
	     * The number of rows of the grid.
	     * @type number
	     */
	    this.height = height;

	    /**
	     * A 2D array of nodes.
	     */
	    this.nodes = this._buildNodes(width, height, matrix);
	}

	/**
	 * Build and return the nodes.
	 * @private
	 * @param {number} width
	 * @param {number} height
	 * @param {Array<Array<number|boolean>>} [matrix] - A 0-1 matrix representing
	 *     the walkable status of the nodes.
	 * @see Grid
	 */
	Grid.prototype._buildNodes = function(width, height, matrix) {
	    var i, j,
	        nodes = new Array(height);

	    for (i = 0; i < height; ++i) {
	        nodes[i] = new Array(width);
	        for (j = 0; j < width; ++j) {
	            nodes[i][j] = new Node(j, i);
	        }
	    }


	    if (matrix === undefined) {
	        return nodes;
	    }

	    if (matrix.length !== height || matrix[0].length !== width) {
	        throw new Error('Matrix size does not fit');
	    }

	    for (i = 0; i < height; ++i) {
	        for (j = 0; j < width; ++j) {
	            if (matrix[i][j]) {
	                // 0, false, null will be walkable
	                // while others will be un-walkable
	                nodes[i][j].walkable = false;
	            }
	        }
	    }

	    return nodes;
	};


	Grid.prototype.getNodeAt = function(x, y) {
	    return this.nodes[y][x];
	};


	/**
	 * Determine whether the node at the given position is walkable.
	 * (Also returns false if the position is outside the grid.)
	 * @param {number} x - The x coordinate of the node.
	 * @param {number} y - The y coordinate of the node.
	 * @return {boolean} - The walkability of the node.
	 */
	Grid.prototype.isWalkableAt = function(x, y) {
	    return this.isInside(x, y) && this.nodes[y][x].walkable;
	};


	/**
	 * Determine whether the position is inside the grid.
	 * XXX: `grid.isInside(x, y)` is wierd to read.
	 * It should be `(x, y) is inside grid`, but I failed to find a better
	 * name for this method.
	 * @param {number} x
	 * @param {number} y
	 * @return {boolean}
	 */
	Grid.prototype.isInside = function(x, y) {
	    return (x >= 0 && x < this.width) && (y >= 0 && y < this.height);
	};


	/**
	 * Set whether the node on the given position is walkable.
	 * NOTE: throws exception if the coordinate is not inside the grid.
	 * @param {number} x - The x coordinate of the node.
	 * @param {number} y - The y coordinate of the node.
	 * @param {boolean} walkable - Whether the position is walkable.
	 */
	Grid.prototype.setWalkableAt = function(x, y, walkable) {
	    this.nodes[y][x].walkable = walkable;
	};


	/**
	 * Get the neighbors of the given node.
	 *
	 *     offsets      diagonalOffsets:
	 *  +---+---+---+    +---+---+---+
	 *  |   | 0 |   |    | 0 |   | 1 |
	 *  +---+---+---+    +---+---+---+
	 *  | 3 |   | 1 |    |   |   |   |
	 *  +---+---+---+    +---+---+---+
	 *  |   | 2 |   |    | 3 |   | 2 |
	 *  +---+---+---+    +---+---+---+
	 *
	 *  When allowDiagonal is true, if offsets[i] is valid, then
	 *  diagonalOffsets[i] and
	 *  diagonalOffsets[(i + 1) % 4] is valid.
	 * @param {Node} node
	 * @param {DiagonalMovement} diagonalMovement
	 */
	Grid.prototype.getNeighbors = function(node, diagonalMovement) {
	    var x = node.x,
	        y = node.y,
	        neighbors = [],
	        s0 = false, d0 = false,
	        s1 = false, d1 = false,
	        s2 = false, d2 = false,
	        s3 = false, d3 = false,
	        nodes = this.nodes;

	    // ↑
	    if (this.isWalkableAt(x, y - 1)) {
	        neighbors.push(nodes[y - 1][x]);
	        s0 = true;
	    }
	    // →
	    if (this.isWalkableAt(x + 1, y)) {
	        neighbors.push(nodes[y][x + 1]);
	        s1 = true;
	    }
	    // ↓
	    if (this.isWalkableAt(x, y + 1)) {
	        neighbors.push(nodes[y + 1][x]);
	        s2 = true;
	    }
	    // ←
	    if (this.isWalkableAt(x - 1, y)) {
	        neighbors.push(nodes[y][x - 1]);
	        s3 = true;
	    }

	    if (diagonalMovement === DiagonalMovement.Never) {
	        return neighbors;
	    }

	    if (diagonalMovement === DiagonalMovement.OnlyWhenNoObstacles) {
	        d0 = s3 && s0;
	        d1 = s0 && s1;
	        d2 = s1 && s2;
	        d3 = s2 && s3;
	    } else if (diagonalMovement === DiagonalMovement.IfAtMostOneObstacle) {
	        d0 = s3 || s0;
	        d1 = s0 || s1;
	        d2 = s1 || s2;
	        d3 = s2 || s3;
	    } else if (diagonalMovement === DiagonalMovement.Always) {
	        d0 = true;
	        d1 = true;
	        d2 = true;
	        d3 = true;
	    } else {
	        throw new Error('Incorrect value of diagonalMovement');
	    }

	    // ↖
	    if (d0 && this.isWalkableAt(x - 1, y - 1)) {
	        neighbors.push(nodes[y - 1][x - 1]);
	    }
	    // ↗
	    if (d1 && this.isWalkableAt(x + 1, y - 1)) {
	        neighbors.push(nodes[y - 1][x + 1]);
	    }
	    // ↘
	    if (d2 && this.isWalkableAt(x + 1, y + 1)) {
	        neighbors.push(nodes[y + 1][x + 1]);
	    }
	    // ↙
	    if (d3 && this.isWalkableAt(x - 1, y + 1)) {
	        neighbors.push(nodes[y + 1][x - 1]);
	    }

	    return neighbors;
	};


	/**
	 * Get a clone of this grid.
	 * @return {Grid} Cloned grid.
	 */
	Grid.prototype.clone = function() {
	    var i, j,

	        width = this.width,
	        height = this.height,
	        thisNodes = this.nodes,

	        newGrid = new Grid(width, height),
	        newNodes = new Array(height);

	    for (i = 0; i < height; ++i) {
	        newNodes[i] = new Array(width);
	        for (j = 0; j < width; ++j) {
	            newNodes[i][j] = new Node(j, i, thisNodes[i][j].walkable);
	        }
	    }

	    newGrid.nodes = newNodes;

	    return newGrid;
	};

	module.exports = Grid;


/***/ },
/* 7 */
/***/ function(module, exports) {

	/**
	 * A node in grid. 
	 * This class holds some basic information about a node and custom 
	 * attributes may be added, depending on the algorithms' needs.
	 * @constructor
	 * @param {number} x - The x coordinate of the node on the grid.
	 * @param {number} y - The y coordinate of the node on the grid.
	 * @param {boolean} [walkable] - Whether this node is walkable.
	 */
	function Node(x, y, walkable) {
	    /**
	     * The x coordinate of the node on the grid.
	     * @type number
	     */
	    this.x = x;
	    /**
	     * The y coordinate of the node on the grid.
	     * @type number
	     */
	    this.y = y;
	    /**
	     * Whether this node can be walked through.
	     * @type boolean
	     */
	    this.walkable = (walkable === undefined ? true : walkable);
	}

	module.exports = Node;


/***/ },
/* 8 */
/***/ function(module, exports) {

	var DiagonalMovement = {
	    Always: 1,
	    Never: 2,
	    IfAtMostOneObstacle: 3,
	    OnlyWhenNoObstacles: 4
	};

	module.exports = DiagonalMovement;

/***/ },
/* 9 */
/***/ function(module, exports) {

	/**
	 * Backtrace according to the parent records and return the path.
	 * (including both start and end nodes)
	 * @param {Node} node End node
	 * @return {Array<Array<number>>} the path
	 */
	function backtrace(node) {
	    var path = [[node.x, node.y]];
	    while (node.parent) {
	        node = node.parent;
	        path.push([node.x, node.y]);
	    }
	    return path.reverse();
	}
	exports.backtrace = backtrace;

	/**
	 * Backtrace from start and end node, and return the path.
	 * (including both start and end nodes)
	 * @param {Node}
	 * @param {Node}
	 */
	function biBacktrace(nodeA, nodeB) {
	    var pathA = backtrace(nodeA),
	        pathB = backtrace(nodeB);
	    return pathA.concat(pathB.reverse());
	}
	exports.biBacktrace = biBacktrace;

	/**
	 * Compute the length of the path.
	 * @param {Array<Array<number>>} path The path
	 * @return {number} The length of the path
	 */
	function pathLength(path) {
	    var i, sum = 0, a, b, dx, dy;
	    for (i = 1; i < path.length; ++i) {
	        a = path[i - 1];
	        b = path[i];
	        dx = a[0] - b[0];
	        dy = a[1] - b[1];
	        sum += Math.sqrt(dx * dx + dy * dy);
	    }
	    return sum;
	}
	exports.pathLength = pathLength;


	/**
	 * Given the start and end coordinates, return all the coordinates lying
	 * on the line formed by these coordinates, based on Bresenham's algorithm.
	 * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm#Simplification
	 * @param {number} x0 Start x coordinate
	 * @param {number} y0 Start y coordinate
	 * @param {number} x1 End x coordinate
	 * @param {number} y1 End y coordinate
	 * @return {Array<Array<number>>} The coordinates on the line
	 */
	function interpolate(x0, y0, x1, y1) {
	    var abs = Math.abs,
	        line = [],
	        sx, sy, dx, dy, err, e2;

	    dx = abs(x1 - x0);
	    dy = abs(y1 - y0);

	    sx = (x0 < x1) ? 1 : -1;
	    sy = (y0 < y1) ? 1 : -1;

	    err = dx - dy;

	    while (true) {
	        line.push([x0, y0]);

	        if (x0 === x1 && y0 === y1) {
	            break;
	        }
	        
	        e2 = 2 * err;
	        if (e2 > -dy) {
	            err = err - dy;
	            x0 = x0 + sx;
	        }
	        if (e2 < dx) {
	            err = err + dx;
	            y0 = y0 + sy;
	        }
	    }

	    return line;
	}
	exports.interpolate = interpolate;


	/**
	 * Given a compressed path, return a new path that has all the segments
	 * in it interpolated.
	 * @param {Array<Array<number>>} path The path
	 * @return {Array<Array<number>>} expanded path
	 */
	function expandPath(path) {
	    var expanded = [],
	        len = path.length,
	        coord0, coord1,
	        interpolated,
	        interpolatedLen,
	        i, j;

	    if (len < 2) {
	        return expanded;
	    }

	    for (i = 0; i < len - 1; ++i) {
	        coord0 = path[i];
	        coord1 = path[i + 1];

	        interpolated = interpolate(coord0[0], coord0[1], coord1[0], coord1[1]);
	        interpolatedLen = interpolated.length;
	        for (j = 0; j < interpolatedLen - 1; ++j) {
	            expanded.push(interpolated[j]);
	        }
	    }
	    expanded.push(path[len - 1]);

	    return expanded;
	}
	exports.expandPath = expandPath;


	/**
	 * Smoothen the give path.
	 * The original path will not be modified; a new path will be returned.
	 * @param {PF.Grid} grid
	 * @param {Array<Array<number>>} path The path
	 */
	function smoothenPath(grid, path) {
	    var len = path.length,
	        x0 = path[0][0],        // path start x
	        y0 = path[0][1],        // path start y
	        x1 = path[len - 1][0],  // path end x
	        y1 = path[len - 1][1],  // path end y
	        sx, sy,                 // current start coordinate
	        ex, ey,                 // current end coordinate
	        newPath,
	        i, j, coord, line, testCoord, blocked;

	    sx = x0;
	    sy = y0;
	    newPath = [[sx, sy]];

	    for (i = 2; i < len; ++i) {
	        coord = path[i];
	        ex = coord[0];
	        ey = coord[1];
	        line = interpolate(sx, sy, ex, ey);

	        blocked = false;
	        for (j = 1; j < line.length; ++j) {
	            testCoord = line[j];

	            if (!grid.isWalkableAt(testCoord[0], testCoord[1])) {
	                blocked = true;
	                break;
	            }
	        }
	        if (blocked) {
	            lastValidCoord = path[i - 1];
	            newPath.push(lastValidCoord);
	            sx = lastValidCoord[0];
	            sy = lastValidCoord[1];
	        }
	    }
	    newPath.push([x1, y1]);

	    return newPath;
	}
	exports.smoothenPath = smoothenPath;


	/**
	 * Compress a path, remove redundant nodes without altering the shape
	 * The original path is not modified
	 * @param {Array<Array<number>>} path The path
	 * @return {Array<Array<number>>} The compressed path
	 */
	function compressPath(path) {

	    // nothing to compress
	    if(path.length < 3) {
	        return path;
	    }

	    var compressed = [],
	        sx = path[0][0], // start x
	        sy = path[0][1], // start y
	        px = path[1][0], // second point x
	        py = path[1][1], // second point y
	        dx = px - sx, // direction between the two points
	        dy = py - sy, // direction between the two points
	        lx, ly,
	        ldx, ldy,
	        sq, i;

	    // normalize the direction
	    sq = Math.sqrt(dx*dx + dy*dy);
	    dx /= sq;
	    dy /= sq;

	    // start the new path
	    compressed.push([sx,sy]);

	    for(i = 2; i < path.length; i++) {

	        // store the last point
	        lx = px;
	        ly = py;

	        // store the last direction
	        ldx = dx;
	        ldy = dy;

	        // next point
	        px = path[i][0];
	        py = path[i][1];

	        // next direction
	        dx = px - lx;
	        dy = py - ly;

	        // normalize
	        sq = Math.sqrt(dx*dx + dy*dy);
	        dx /= sq;
	        dy /= sq;

	        // if the direction has changed, store the point
	        if ( dx !== ldx || dy !== ldy ) {
	            compressed.push([lx,ly]);
	        }
	    }

	    // store the last point
	    compressed.push([px,py]);

	    return compressed;
	}
	exports.compressPath = compressPath;


/***/ },
/* 10 */
/***/ function(module, exports) {

	/**
	 * @namespace PF.Heuristic
	 * @description A collection of heuristic functions.
	 */
	module.exports = {

	  /**
	   * Manhattan distance.
	   * @param {number} dx - Difference in x.
	   * @param {number} dy - Difference in y.
	   * @return {number} dx + dy
	   */
	  manhattan: function(dx, dy) {
	      return dx + dy;
	  },

	  /**
	   * Euclidean distance.
	   * @param {number} dx - Difference in x.
	   * @param {number} dy - Difference in y.
	   * @return {number} sqrt(dx * dx + dy * dy)
	   */
	  euclidean: function(dx, dy) {
	      return Math.sqrt(dx * dx + dy * dy);
	  },

	  /**
	   * Octile distance.
	   * @param {number} dx - Difference in x.
	   * @param {number} dy - Difference in y.
	   * @return {number} sqrt(dx * dx + dy * dy) for grids
	   */
	  octile: function(dx, dy) {
	      var F = Math.SQRT2 - 1;
	      return (dx < dy) ? F * dx + dy : F * dy + dx;
	  },

	  /**
	   * Chebyshev distance.
	   * @param {number} dx - Difference in x.
	   * @param {number} dy - Difference in y.
	   * @return {number} max(dx, dy)
	   */
	  chebyshev: function(dx, dy) {
	      return Math.max(dx, dy);
	  }

	};


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @author aniero / https://github.com/aniero
	 */
	var DiagonalMovement = __webpack_require__(8);
	var JPFNeverMoveDiagonally = __webpack_require__(12);
	var JPFAlwaysMoveDiagonally = __webpack_require__(17);
	var JPFMoveDiagonallyIfNoObstacles = __webpack_require__(18);
	var JPFMoveDiagonallyIfAtMostOneObstacle = __webpack_require__(19);

	/**
	 * Path finder using the Jump Point Search algorithm
	 * @param {Object} opt
	 * @param {function} opt.heuristic Heuristic function to estimate the distance
	 *     (defaults to manhattan).
	 * @param {DiagonalMovement} opt.diagonalMovement Condition under which diagonal
	 *      movement will be allowed.
	 */
	function JumpPointFinder(opt) {
	    opt = opt || {};
	    if (opt.diagonalMovement === DiagonalMovement.Never) {
	        return new JPFNeverMoveDiagonally(opt);
	    } else if (opt.diagonalMovement === DiagonalMovement.Always) {
	        return new JPFAlwaysMoveDiagonally(opt);
	    } else if (opt.diagonalMovement === DiagonalMovement.OnlyWhenNoObstacles) {
	        return new JPFMoveDiagonallyIfNoObstacles(opt);
	    } else {
	        return new JPFMoveDiagonallyIfAtMostOneObstacle(opt);
	    }
	}

	module.exports = JumpPointFinder;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @author imor / https://github.com/imor
	 */
	var JumpPointFinderBase = __webpack_require__(13);
	var DiagonalMovement = __webpack_require__(8);

	/**
	 * Path finder using the Jump Point Search algorithm allowing only horizontal
	 * or vertical movements.
	 */
	function JPFNeverMoveDiagonally(opt) {
	    JumpPointFinderBase.call(this, opt);
	}

	JPFNeverMoveDiagonally.prototype = new JumpPointFinderBase();
	JPFNeverMoveDiagonally.prototype.constructor = JPFNeverMoveDiagonally;

	/**
	 * Search recursively in the direction (parent -> child), stopping only when a
	 * jump point is found.
	 * @protected
	 * @return {Array<Array<number>>} The x, y coordinate of the jump point
	 *     found, or null if not found
	 */
	JPFNeverMoveDiagonally.prototype._jump = function(x, y, px, py) {
	    var grid = this.grid,
	        dx = x - px, dy = y - py;

	    if (!grid.isWalkableAt(x, y)) {
	        return null;
	    }

	    if(this.trackJumpRecursion === true) {
	        grid.getNodeAt(x, y).tested = true;
	    }

	    if (grid.getNodeAt(x, y) === this.endNode) {
	        return [x, y];
	    }

	    if (dx !== 0) {
	        if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) ||
	            (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
	            return [x, y];
	        }
	    }
	    else if (dy !== 0) {
	        if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) ||
	            (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
	            return [x, y];
	        }
	        //When moving vertically, must check for horizontal jump points
	        if (this._jump(x + 1, y, x, y) || this._jump(x - 1, y, x, y)) {
	            return [x, y];
	        }
	    }
	    else {
	        throw new Error("Only horizontal and vertical movements are allowed");
	    }

	    return this._jump(x + dx, y + dy, x, y);
	};

	/**
	 * Find the neighbors for the given node. If the node has a parent,
	 * prune the neighbors based on the jump point search algorithm, otherwise
	 * return all available neighbors.
	 * @return {Array<Array<number>>} The neighbors found.
	 */
	JPFNeverMoveDiagonally.prototype._findNeighbors = function(node) {
	    var parent = node.parent,
	        x = node.x, y = node.y,
	        grid = this.grid,
	        px, py, nx, ny, dx, dy,
	        neighbors = [], neighborNodes, neighborNode, i, l;

	    // directed pruning: can ignore most neighbors, unless forced.
	    if (parent) {
	        px = parent.x;
	        py = parent.y;
	        // get the normalized direction of travel
	        dx = (x - px) / Math.max(Math.abs(x - px), 1);
	        dy = (y - py) / Math.max(Math.abs(y - py), 1);

	        if (dx !== 0) {
	            if (grid.isWalkableAt(x, y - 1)) {
	                neighbors.push([x, y - 1]);
	            }
	            if (grid.isWalkableAt(x, y + 1)) {
	                neighbors.push([x, y + 1]);
	            }
	            if (grid.isWalkableAt(x + dx, y)) {
	                neighbors.push([x + dx, y]);
	            }
	        }
	        else if (dy !== 0) {
	            if (grid.isWalkableAt(x - 1, y)) {
	                neighbors.push([x - 1, y]);
	            }
	            if (grid.isWalkableAt(x + 1, y)) {
	                neighbors.push([x + 1, y]);
	            }
	            if (grid.isWalkableAt(x, y + dy)) {
	                neighbors.push([x, y + dy]);
	            }
	        }
	    }
	    // return all neighbors
	    else {
	        neighborNodes = grid.getNeighbors(node, DiagonalMovement.Never);
	        for (i = 0, l = neighborNodes.length; i < l; ++i) {
	            neighborNode = neighborNodes[i];
	            neighbors.push([neighborNode.x, neighborNode.y]);
	        }
	    }

	    return neighbors;
	};

	module.exports = JPFNeverMoveDiagonally;


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @author imor / https://github.com/imor
	 */
	var Heap       = __webpack_require__(14);
	var Util       = __webpack_require__(9);
	var Heuristic  = __webpack_require__(10);
	var DiagonalMovement = __webpack_require__(8);

	/**
	 * Base class for the Jump Point Search algorithm
	 * @param {object} opt
	 * @param {function} opt.heuristic Heuristic function to estimate the distance
	 *     (defaults to manhattan).
	 */
	function JumpPointFinderBase(opt) {
	    opt = opt || {};
	    this.heuristic = opt.heuristic || Heuristic.manhattan;
	    this.trackJumpRecursion = opt.trackJumpRecursion || false;
	}

	/**
	 * Find and return the path.
	 * @return {Array<Array<number>>} The path, including both start and
	 *     end positions.
	 */
	JumpPointFinderBase.prototype.findPath = function(startX, startY, endX, endY, grid) {
	    var openList = this.openList = new Heap(function(nodeA, nodeB) {
	            return nodeA.f - nodeB.f;
	        }),
	        startNode = this.startNode = grid.getNodeAt(startX, startY),
	        endNode = this.endNode = grid.getNodeAt(endX, endY), node;

	    this.grid = grid;


	    // set the `g` and `f` value of the start node to be 0
	    startNode.g = 0;
	    startNode.f = 0;

	    // push the start node into the open list
	    openList.push(startNode);
	    startNode.opened = true;

	    // while the open list is not empty
	    while (!openList.empty()) {
	        // pop the position of node which has the minimum `f` value.
	        node = openList.pop();
	        node.closed = true;

	        if (node === endNode) {
	            return Util.expandPath(Util.backtrace(endNode));
	        }

	        this._identifySuccessors(node);
	    }

	    // fail to find the path
	    return [];
	};

	/**
	 * Identify successors for the given node. Runs a jump point search in the
	 * direction of each available neighbor, adding any points found to the open
	 * list.
	 * @protected
	 */
	JumpPointFinderBase.prototype._identifySuccessors = function(node) {
	    var grid = this.grid,
	        heuristic = this.heuristic,
	        openList = this.openList,
	        endX = this.endNode.x,
	        endY = this.endNode.y,
	        neighbors, neighbor,
	        jumpPoint, i, l,
	        x = node.x, y = node.y,
	        jx, jy, dx, dy, d, ng, jumpNode,
	        abs = Math.abs, max = Math.max;

	    neighbors = this._findNeighbors(node);
	    for(i = 0, l = neighbors.length; i < l; ++i) {
	        neighbor = neighbors[i];
	        jumpPoint = this._jump(neighbor[0], neighbor[1], x, y);
	        if (jumpPoint) {

	            jx = jumpPoint[0];
	            jy = jumpPoint[1];
	            jumpNode = grid.getNodeAt(jx, jy);

	            if (jumpNode.closed) {
	                continue;
	            }

	            // include distance, as parent may not be immediately adjacent:
	            d = Heuristic.octile(abs(jx - x), abs(jy - y));
	            ng = node.g + d; // next `g` value

	            if (!jumpNode.opened || ng < jumpNode.g) {
	                jumpNode.g = ng;
	                jumpNode.h = jumpNode.h || heuristic(abs(jx - endX), abs(jy - endY));
	                jumpNode.f = jumpNode.g + jumpNode.h;
	                jumpNode.parent = node;

	                if (!jumpNode.opened) {
	                    openList.push(jumpNode);
	                    jumpNode.opened = true;
	                } else {
	                    openList.updateItem(jumpNode);
	                }
	            }
	        }
	    }
	};

	module.exports = JumpPointFinderBase;


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(15);


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(module) {// Generated by CoffeeScript 1.8.0
	(function() {
	  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

	  floor = Math.floor, min = Math.min;


	  /*
	  Default comparison function to be used
	   */

	  defaultCmp = function(x, y) {
	    if (x < y) {
	      return -1;
	    }
	    if (x > y) {
	      return 1;
	    }
	    return 0;
	  };


	  /*
	  Insert item x in list a, and keep it sorted assuming a is sorted.
	  
	  If x is already in a, insert it to the right of the rightmost x.
	  
	  Optional args lo (default 0) and hi (default a.length) bound the slice
	  of a to be searched.
	   */

	  insort = function(a, x, lo, hi, cmp) {
	    var mid;
	    if (lo == null) {
	      lo = 0;
	    }
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    if (lo < 0) {
	      throw new Error('lo must be non-negative');
	    }
	    if (hi == null) {
	      hi = a.length;
	    }
	    while (lo < hi) {
	      mid = floor((lo + hi) / 2);
	      if (cmp(x, a[mid]) < 0) {
	        hi = mid;
	      } else {
	        lo = mid + 1;
	      }
	    }
	    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
	  };


	  /*
	  Push item onto heap, maintaining the heap invariant.
	   */

	  heappush = function(array, item, cmp) {
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    array.push(item);
	    return _siftdown(array, 0, array.length - 1, cmp);
	  };


	  /*
	  Pop the smallest item off the heap, maintaining the heap invariant.
	   */

	  heappop = function(array, cmp) {
	    var lastelt, returnitem;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    lastelt = array.pop();
	    if (array.length) {
	      returnitem = array[0];
	      array[0] = lastelt;
	      _siftup(array, 0, cmp);
	    } else {
	      returnitem = lastelt;
	    }
	    return returnitem;
	  };


	  /*
	  Pop and return the current smallest value, and add the new item.
	  
	  This is more efficient than heappop() followed by heappush(), and can be
	  more appropriate when using a fixed size heap. Note that the value
	  returned may be larger than item! That constrains reasonable use of
	  this routine unless written as part of a conditional replacement:
	      if item > array[0]
	        item = heapreplace(array, item)
	   */

	  heapreplace = function(array, item, cmp) {
	    var returnitem;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    returnitem = array[0];
	    array[0] = item;
	    _siftup(array, 0, cmp);
	    return returnitem;
	  };


	  /*
	  Fast version of a heappush followed by a heappop.
	   */

	  heappushpop = function(array, item, cmp) {
	    var _ref;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    if (array.length && cmp(array[0], item) < 0) {
	      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
	      _siftup(array, 0, cmp);
	    }
	    return item;
	  };


	  /*
	  Transform list into a heap, in-place, in O(array.length) time.
	   */

	  heapify = function(array, cmp) {
	    var i, _i, _j, _len, _ref, _ref1, _results, _results1;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    _ref1 = (function() {
	      _results1 = [];
	      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
	      return _results1;
	    }).apply(this).reverse();
	    _results = [];
	    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
	      i = _ref1[_i];
	      _results.push(_siftup(array, i, cmp));
	    }
	    return _results;
	  };


	  /*
	  Update the position of the given item in the heap.
	  This function should be called every time the item is being modified.
	   */

	  updateItem = function(array, item, cmp) {
	    var pos;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    pos = array.indexOf(item);
	    if (pos === -1) {
	      return;
	    }
	    _siftdown(array, 0, pos, cmp);
	    return _siftup(array, pos, cmp);
	  };


	  /*
	  Find the n largest elements in a dataset.
	   */

	  nlargest = function(array, n, cmp) {
	    var elem, result, _i, _len, _ref;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    result = array.slice(0, n);
	    if (!result.length) {
	      return result;
	    }
	    heapify(result, cmp);
	    _ref = array.slice(n);
	    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
	      elem = _ref[_i];
	      heappushpop(result, elem, cmp);
	    }
	    return result.sort(cmp).reverse();
	  };


	  /*
	  Find the n smallest elements in a dataset.
	   */

	  nsmallest = function(array, n, cmp) {
	    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    if (n * 10 <= array.length) {
	      result = array.slice(0, n).sort(cmp);
	      if (!result.length) {
	        return result;
	      }
	      los = result[result.length - 1];
	      _ref = array.slice(n);
	      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
	        elem = _ref[_i];
	        if (cmp(elem, los) < 0) {
	          insort(result, elem, 0, null, cmp);
	          result.pop();
	          los = result[result.length - 1];
	        }
	      }
	      return result;
	    }
	    heapify(array, cmp);
	    _results = [];
	    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
	      _results.push(heappop(array, cmp));
	    }
	    return _results;
	  };

	  _siftdown = function(array, startpos, pos, cmp) {
	    var newitem, parent, parentpos;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    newitem = array[pos];
	    while (pos > startpos) {
	      parentpos = (pos - 1) >> 1;
	      parent = array[parentpos];
	      if (cmp(newitem, parent) < 0) {
	        array[pos] = parent;
	        pos = parentpos;
	        continue;
	      }
	      break;
	    }
	    return array[pos] = newitem;
	  };

	  _siftup = function(array, pos, cmp) {
	    var childpos, endpos, newitem, rightpos, startpos;
	    if (cmp == null) {
	      cmp = defaultCmp;
	    }
	    endpos = array.length;
	    startpos = pos;
	    newitem = array[pos];
	    childpos = 2 * pos + 1;
	    while (childpos < endpos) {
	      rightpos = childpos + 1;
	      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
	        childpos = rightpos;
	      }
	      array[pos] = array[childpos];
	      pos = childpos;
	      childpos = 2 * pos + 1;
	    }
	    array[pos] = newitem;
	    return _siftdown(array, startpos, pos, cmp);
	  };

	  Heap = (function() {
	    Heap.push = heappush;

	    Heap.pop = heappop;

	    Heap.replace = heapreplace;

	    Heap.pushpop = heappushpop;

	    Heap.heapify = heapify;

	    Heap.updateItem = updateItem;

	    Heap.nlargest = nlargest;

	    Heap.nsmallest = nsmallest;

	    function Heap(cmp) {
	      this.cmp = cmp != null ? cmp : defaultCmp;
	      this.nodes = [];
	    }

	    Heap.prototype.push = function(x) {
	      return heappush(this.nodes, x, this.cmp);
	    };

	    Heap.prototype.pop = function() {
	      return heappop(this.nodes, this.cmp);
	    };

	    Heap.prototype.peek = function() {
	      return this.nodes[0];
	    };

	    Heap.prototype.contains = function(x) {
	      return this.nodes.indexOf(x) !== -1;
	    };

	    Heap.prototype.replace = function(x) {
	      return heapreplace(this.nodes, x, this.cmp);
	    };

	    Heap.prototype.pushpop = function(x) {
	      return heappushpop(this.nodes, x, this.cmp);
	    };

	    Heap.prototype.heapify = function() {
	      return heapify(this.nodes, this.cmp);
	    };

	    Heap.prototype.updateItem = function(x) {
	      return updateItem(this.nodes, x, this.cmp);
	    };

	    Heap.prototype.clear = function() {
	      return this.nodes = [];
	    };

	    Heap.prototype.empty = function() {
	      return this.nodes.length === 0;
	    };

	    Heap.prototype.size = function() {
	      return this.nodes.length;
	    };

	    Heap.prototype.clone = function() {
	      var heap;
	      heap = new Heap();
	      heap.nodes = this.nodes.slice(0);
	      return heap;
	    };

	    Heap.prototype.toArray = function() {
	      return this.nodes.slice(0);
	    };

	    Heap.prototype.insert = Heap.prototype.push;

	    Heap.prototype.top = Heap.prototype.peek;

	    Heap.prototype.front = Heap.prototype.peek;

	    Heap.prototype.has = Heap.prototype.contains;

	    Heap.prototype.copy = Heap.prototype.clone;

	    return Heap;

	  })();

	  if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
	    module.exports = Heap;
	  } else {
	    window.Heap = Heap;
	  }

	}).call(this);

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)(module)))

/***/ },
/* 16 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @author imor / https://github.com/imor
	 */
	var JumpPointFinderBase = __webpack_require__(13);
	var DiagonalMovement = __webpack_require__(8);

	/**
	 * Path finder using the Jump Point Search algorithm which always moves
	 * diagonally irrespective of the number of obstacles.
	 */
	function JPFAlwaysMoveDiagonally(opt) {
	    JumpPointFinderBase.call(this, opt);
	}

	JPFAlwaysMoveDiagonally.prototype = new JumpPointFinderBase();
	JPFAlwaysMoveDiagonally.prototype.constructor = JPFAlwaysMoveDiagonally;

	/**
	 * Search recursively in the direction (parent -> child), stopping only when a
	 * jump point is found.
	 * @protected
	 * @return {Array<Array<number>>} The x, y coordinate of the jump point
	 *     found, or null if not found
	 */
	JPFAlwaysMoveDiagonally.prototype._jump = function(x, y, px, py) {
	    var grid = this.grid,
	        dx = x - px, dy = y - py;

	    if (!grid.isWalkableAt(x, y)) {
	        return null;
	    }

	    if(this.trackJumpRecursion === true) {
	        grid.getNodeAt(x, y).tested = true;
	    }

	    if (grid.getNodeAt(x, y) === this.endNode) {
	        return [x, y];
	    }

	    // check for forced neighbors
	    // along the diagonal
	    if (dx !== 0 && dy !== 0) {
	        if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
	            (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
	            return [x, y];
	        }
	        // when moving diagonally, must check for vertical/horizontal jump points
	        if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
	            return [x, y];
	        }
	    }
	    // horizontally/vertically
	    else {
	        if( dx !== 0 ) { // moving along x
	            if((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) ||
	               (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
	                return [x, y];
	            }
	        }
	        else {
	            if((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) ||
	               (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
	                return [x, y];
	            }
	        }
	    }

	    return this._jump(x + dx, y + dy, x, y);
	};

	/**
	 * Find the neighbors for the given node. If the node has a parent,
	 * prune the neighbors based on the jump point search algorithm, otherwise
	 * return all available neighbors.
	 * @return {Array<Array<number>>} The neighbors found.
	 */
	JPFAlwaysMoveDiagonally.prototype._findNeighbors = function(node) {
	    var parent = node.parent,
	        x = node.x, y = node.y,
	        grid = this.grid,
	        px, py, nx, ny, dx, dy,
	        neighbors = [], neighborNodes, neighborNode, i, l;

	    // directed pruning: can ignore most neighbors, unless forced.
	    if (parent) {
	        px = parent.x;
	        py = parent.y;
	        // get the normalized direction of travel
	        dx = (x - px) / Math.max(Math.abs(x - px), 1);
	        dy = (y - py) / Math.max(Math.abs(y - py), 1);

	        // search diagonally
	        if (dx !== 0 && dy !== 0) {
	            if (grid.isWalkableAt(x, y + dy)) {
	                neighbors.push([x, y + dy]);
	            }
	            if (grid.isWalkableAt(x + dx, y)) {
	                neighbors.push([x + dx, y]);
	            }
	            if (grid.isWalkableAt(x + dx, y + dy)) {
	                neighbors.push([x + dx, y + dy]);
	            }
	            if (!grid.isWalkableAt(x - dx, y)) {
	                neighbors.push([x - dx, y + dy]);
	            }
	            if (!grid.isWalkableAt(x, y - dy)) {
	                neighbors.push([x + dx, y - dy]);
	            }
	        }
	        // search horizontally/vertically
	        else {
	            if(dx === 0) {
	                if (grid.isWalkableAt(x, y + dy)) {
	                    neighbors.push([x, y + dy]);
	                }
	                if (!grid.isWalkableAt(x + 1, y)) {
	                    neighbors.push([x + 1, y + dy]);
	                }
	                if (!grid.isWalkableAt(x - 1, y)) {
	                    neighbors.push([x - 1, y + dy]);
	                }
	            }
	            else {
	                if (grid.isWalkableAt(x + dx, y)) {
	                    neighbors.push([x + dx, y]);
	                }
	                if (!grid.isWalkableAt(x, y + 1)) {
	                    neighbors.push([x + dx, y + 1]);
	                }
	                if (!grid.isWalkableAt(x, y - 1)) {
	                    neighbors.push([x + dx, y - 1]);
	                }
	            }
	        }
	    }
	    // return all neighbors
	    else {
	        neighborNodes = grid.getNeighbors(node, DiagonalMovement.Always);
	        for (i = 0, l = neighborNodes.length; i < l; ++i) {
	            neighborNode = neighborNodes[i];
	            neighbors.push([neighborNode.x, neighborNode.y]);
	        }
	    }

	    return neighbors;
	};

	module.exports = JPFAlwaysMoveDiagonally;


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @author imor / https://github.com/imor
	 */
	var JumpPointFinderBase = __webpack_require__(13);
	var DiagonalMovement = __webpack_require__(8);

	/**
	 * Path finder using the Jump Point Search algorithm which moves
	 * diagonally only when there are no obstacles.
	 */
	function JPFMoveDiagonallyIfNoObstacles(opt) {
	    JumpPointFinderBase.call(this, opt);
	}

	JPFMoveDiagonallyIfNoObstacles.prototype = new JumpPointFinderBase();
	JPFMoveDiagonallyIfNoObstacles.prototype.constructor = JPFMoveDiagonallyIfNoObstacles;

	/**
	 * Search recursively in the direction (parent -> child), stopping only when a
	 * jump point is found.
	 * @protected
	 * @return {Array<Array<number>>} The x, y coordinate of the jump point
	 *     found, or null if not found
	 */
	JPFMoveDiagonallyIfNoObstacles.prototype._jump = function(x, y, px, py) {
	    var grid = this.grid,
	        dx = x - px, dy = y - py;

	    if (!grid.isWalkableAt(x, y)) {
	        return null;
	    }

	    if(this.trackJumpRecursion === true) {
	        grid.getNodeAt(x, y).tested = true;
	    }

	    if (grid.getNodeAt(x, y) === this.endNode) {
	        return [x, y];
	    }

	    // check for forced neighbors
	    // along the diagonal
	    if (dx !== 0 && dy !== 0) {
	        // if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
	            // (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
	            // return [x, y];
	        // }
	        // when moving diagonally, must check for vertical/horizontal jump points
	        if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
	            return [x, y];
	        }
	    }
	    // horizontally/vertically
	    else {
	        if (dx !== 0) {
	            if ((grid.isWalkableAt(x, y - 1) && !grid.isWalkableAt(x - dx, y - 1)) ||
	                (grid.isWalkableAt(x, y + 1) && !grid.isWalkableAt(x - dx, y + 1))) {
	                return [x, y];
	            }
	        }
	        else if (dy !== 0) {
	            if ((grid.isWalkableAt(x - 1, y) && !grid.isWalkableAt(x - 1, y - dy)) ||
	                (grid.isWalkableAt(x + 1, y) && !grid.isWalkableAt(x + 1, y - dy))) {
	                return [x, y];
	            }
	            // When moving vertically, must check for horizontal jump points
	            // if (this._jump(x + 1, y, x, y) || this._jump(x - 1, y, x, y)) {
	                // return [x, y];
	            // }
	        }
	    }

	    // moving diagonally, must make sure one of the vertical/horizontal
	    // neighbors is open to allow the path
	    if (grid.isWalkableAt(x + dx, y) && grid.isWalkableAt(x, y + dy)) {
	        return this._jump(x + dx, y + dy, x, y);
	    } else {
	        return null;
	    }
	};

	/**
	 * Find the neighbors for the given node. If the node has a parent,
	 * prune the neighbors based on the jump point search algorithm, otherwise
	 * return all available neighbors.
	 * @return {Array<Array<number>>} The neighbors found.
	 */
	JPFMoveDiagonallyIfNoObstacles.prototype._findNeighbors = function(node) {
	    var parent = node.parent,
	        x = node.x, y = node.y,
	        grid = this.grid,
	        px, py, nx, ny, dx, dy,
	        neighbors = [], neighborNodes, neighborNode, i, l;

	    // directed pruning: can ignore most neighbors, unless forced.
	    if (parent) {
	        px = parent.x;
	        py = parent.y;
	        // get the normalized direction of travel
	        dx = (x - px) / Math.max(Math.abs(x - px), 1);
	        dy = (y - py) / Math.max(Math.abs(y - py), 1);

	        // search diagonally
	        if (dx !== 0 && dy !== 0) {
	            if (grid.isWalkableAt(x, y + dy)) {
	                neighbors.push([x, y + dy]);
	            }
	            if (grid.isWalkableAt(x + dx, y)) {
	                neighbors.push([x + dx, y]);
	            }
	            if (grid.isWalkableAt(x, y + dy) && grid.isWalkableAt(x + dx, y)) {
	                neighbors.push([x + dx, y + dy]);
	            }
	        }
	        // search horizontally/vertically
	        else {
	            var isNextWalkable;
	            if (dx !== 0) {
	                isNextWalkable = grid.isWalkableAt(x + dx, y);
	                var isTopWalkable = grid.isWalkableAt(x, y + 1);
	                var isBottomWalkable = grid.isWalkableAt(x, y - 1);

	                if (isNextWalkable) {
	                    neighbors.push([x + dx, y]);
	                    if (isTopWalkable) {
	                        neighbors.push([x + dx, y + 1]);
	                    }
	                    if (isBottomWalkable) {
	                        neighbors.push([x + dx, y - 1]);
	                    }
	                }
	                if (isTopWalkable) {
	                    neighbors.push([x, y + 1]);
	                }
	                if (isBottomWalkable) {
	                    neighbors.push([x, y - 1]);
	                }
	            }
	            else if (dy !== 0) {
	                isNextWalkable = grid.isWalkableAt(x, y + dy);
	                var isRightWalkable = grid.isWalkableAt(x + 1, y);
	                var isLeftWalkable = grid.isWalkableAt(x - 1, y);

	                if (isNextWalkable) {
	                    neighbors.push([x, y + dy]);
	                    if (isRightWalkable) {
	                        neighbors.push([x + 1, y + dy]);
	                    }
	                    if (isLeftWalkable) {
	                        neighbors.push([x - 1, y + dy]);
	                    }
	                }
	                if (isRightWalkable) {
	                    neighbors.push([x + 1, y]);
	                }
	                if (isLeftWalkable) {
	                    neighbors.push([x - 1, y]);
	                }
	            }
	        }
	    }
	    // return all neighbors
	    else {
	        neighborNodes = grid.getNeighbors(node, DiagonalMovement.OnlyWhenNoObstacles);
	        for (i = 0, l = neighborNodes.length; i < l; ++i) {
	            neighborNode = neighborNodes[i];
	            neighbors.push([neighborNode.x, neighborNode.y]);
	        }
	    }

	    return neighbors;
	};

	module.exports = JPFMoveDiagonallyIfNoObstacles;


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @author imor / https://github.com/imor
	 */
	var JumpPointFinderBase = __webpack_require__(13);
	var DiagonalMovement = __webpack_require__(8);

	/**
	 * Path finder using the Jump Point Search algorithm which moves
	 * diagonally only when there is at most one obstacle.
	 */
	function JPFMoveDiagonallyIfAtMostOneObstacle(opt) {
	    JumpPointFinderBase.call(this, opt);
	}

	JPFMoveDiagonallyIfAtMostOneObstacle.prototype = new JumpPointFinderBase();
	JPFMoveDiagonallyIfAtMostOneObstacle.prototype.constructor = JPFMoveDiagonallyIfAtMostOneObstacle;

	/**
	 * Search recursively in the direction (parent -> child), stopping only when a
	 * jump point is found.
	 * @protected
	 * @return {Array<Array<number>>} The x, y coordinate of the jump point
	 *     found, or null if not found
	 */
	JPFMoveDiagonallyIfAtMostOneObstacle.prototype._jump = function(x, y, px, py) {
	    var grid = this.grid,
	        dx = x - px, dy = y - py;

	    if (!grid.isWalkableAt(x, y)) {
	        return null;
	    }

	    if(this.trackJumpRecursion === true) {
	        grid.getNodeAt(x, y).tested = true;
	    }

	    if (grid.getNodeAt(x, y) === this.endNode) {
	        return [x, y];
	    }

	    // check for forced neighbors
	    // along the diagonal
	    if (dx !== 0 && dy !== 0) {
	        if ((grid.isWalkableAt(x - dx, y + dy) && !grid.isWalkableAt(x - dx, y)) ||
	            (grid.isWalkableAt(x + dx, y - dy) && !grid.isWalkableAt(x, y - dy))) {
	            return [x, y];
	        }
	        // when moving diagonally, must check for vertical/horizontal jump points
	        if (this._jump(x + dx, y, x, y) || this._jump(x, y + dy, x, y)) {
	            return [x, y];
	        }
	    }
	    // horizontally/vertically
	    else {
	        if( dx !== 0 ) { // moving along x
	            if((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) ||
	               (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
	                return [x, y];
	            }
	        }
	        else {
	            if((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) ||
	               (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
	                return [x, y];
	            }
	        }
	    }

	    // moving diagonally, must make sure one of the vertical/horizontal
	    // neighbors is open to allow the path
	    if (grid.isWalkableAt(x + dx, y) || grid.isWalkableAt(x, y + dy)) {
	        return this._jump(x + dx, y + dy, x, y);
	    } else {
	        return null;
	    }
	};

	/**
	 * Find the neighbors for the given node. If the node has a parent,
	 * prune the neighbors based on the jump point search algorithm, otherwise
	 * return all available neighbors.
	 * @return {Array<Array<number>>} The neighbors found.
	 */
	JPFMoveDiagonallyIfAtMostOneObstacle.prototype._findNeighbors = function(node) {
	    var parent = node.parent,
	        x = node.x, y = node.y,
	        grid = this.grid,
	        px, py, nx, ny, dx, dy,
	        neighbors = [], neighborNodes, neighborNode, i, l;

	    // directed pruning: can ignore most neighbors, unless forced.
	    if (parent) {
	        px = parent.x;
	        py = parent.y;
	        // get the normalized direction of travel
	        dx = (x - px) / Math.max(Math.abs(x - px), 1);
	        dy = (y - py) / Math.max(Math.abs(y - py), 1);

	        // search diagonally
	        if (dx !== 0 && dy !== 0) {
	            if (grid.isWalkableAt(x, y + dy)) {
	                neighbors.push([x, y + dy]);
	            }
	            if (grid.isWalkableAt(x + dx, y)) {
	                neighbors.push([x + dx, y]);
	            }
	            if (grid.isWalkableAt(x, y + dy) || grid.isWalkableAt(x + dx, y)) {
	                neighbors.push([x + dx, y + dy]);
	            }
	            if (!grid.isWalkableAt(x - dx, y) && grid.isWalkableAt(x, y + dy)) {
	                neighbors.push([x - dx, y + dy]);
	            }
	            if (!grid.isWalkableAt(x, y - dy) && grid.isWalkableAt(x + dx, y)) {
	                neighbors.push([x + dx, y - dy]);
	            }
	        }
	        // search horizontally/vertically
	        else {
	            if(dx === 0) {
	                if (grid.isWalkableAt(x, y + dy)) {
	                    neighbors.push([x, y + dy]);
	                    if (!grid.isWalkableAt(x + 1, y)) {
	                        neighbors.push([x + 1, y + dy]);
	                    }
	                    if (!grid.isWalkableAt(x - 1, y)) {
	                        neighbors.push([x - 1, y + dy]);
	                    }
	                }
	            }
	            else {
	                if (grid.isWalkableAt(x + dx, y)) {
	                    neighbors.push([x + dx, y]);
	                    if (!grid.isWalkableAt(x, y + 1)) {
	                        neighbors.push([x + dx, y + 1]);
	                    }
	                    if (!grid.isWalkableAt(x, y - 1)) {
	                        neighbors.push([x + dx, y - 1]);
	                    }
	                }
	            }
	        }
	    }
	    // return all neighbors
	    else {
	        neighborNodes = grid.getNeighbors(node, DiagonalMovement.IfAtMostOneObstacle);
	        for (i = 0, l = neighborNodes.length; i < l; ++i) {
	            neighborNode = neighborNodes[i];
	            neighbors.push([neighborNode.x, neighborNode.y]);
	        }
	    }

	    return neighbors;
	};

	module.exports = JPFMoveDiagonallyIfAtMostOneObstacle;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var logger = __webpack_require__(2);

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



/***/ }
/******/ ]);
;
var onDirectLink = self.onDirectLink;
var onSmartLink = self.onSmartLink;

