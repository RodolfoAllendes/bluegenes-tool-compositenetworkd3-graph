'use strict';

export class MultiLayerNetwork{
	constructor(){
		// structural properties for the network
		this.nodes = new Map();
		this.layers = new Map();
		this.vm = new Map();
		// convenience variable data on display/hidden
		this.displayedLayers = new Map();
	}

	/**
	 * Add the details for a new Layer to the network
	 * @param {string} name the name of the layer
	 * @param {int} idx index (position) of the layer within the graph
	 * @param {string} color color used to draw the nodes of the layer
	 * @param {string} shape shape used to represent the nodes of the layer
	 * @param {boolean} visible whether the layer is drawn or not
	 */
	addLayer(name, idx, color, shape, visible=false){
		this.layers.set(name, {color, shape, idx});
		this.displayedLayers.set(name, {display:visible});
	}

	/**
	 * Add nodes to a given Layer of the network
	 * @param {string} layer the layer to which nodes will be added
	 * @param {array} data array representation of a set of nodes, to be added
	 * to the network
	 */
	addNodes(layer, data){
		// retrieve current vm for the layer
		let vm = this.vm.get(layer) || new Map();
		data.forEach(ele => {
			// add general node information to the list (if required)
			if(!this.nodes.has(ele.dbid)){
				this.nodes.set(ele.dbid, {id: ele.id, symbol: ele.symbol});	
			}
			// and add more graphical information associated to the version of
			// the node in the current layer
			let linkedTo = ele.linkedTo !== undefined ? [[ele.linkedTo, ele.linkedLayer]] : []; 
			if(!vm.has(ele.dbid))
				vm.set(ele.dbid, { isGroup:false, linkedTo });
			else // if node is already in the network only update its parents
				vm.get(ele.dbid).linkedTo.push(...linkedTo);
		}, this);
		// update the vm element for the layer
		this.vm.set(layer, vm);
	}

	/**
	 * Return data used for the display of edges in the network
	 * @returns a data array with edge information
	 */
	getDisplayEdges(){
		let data = [];
		let dsplLayers = this.getLayersInOrder();
		if (dsplLayers.length < 2)
			return data;
		
		let shifts = [ 0 ];
		dsplLayers.forEach((dl,i) => {
			shifts.push(shifts[i]+this.layers.get(dl).dims.height);
		});
		
		dsplLayers.forEach((dl,i) => {
			let layer = this.vm.get(dl);
			[...layer.entries()].forEach(([id,node]) => {
				node.linkedTo.forEach(link => {
					let j = dsplLayers.indexOf(link[1]);
					if( j!== -1){
						let target = this.vm.get(link[1]).get(link[0]);
						data.push({
							source: { x: node.x, y: shifts[i]+node.y, id,	layer: dl	},
							target: {	x: target.x, y: shifts[j]+target.y,	id:	link[0], layer: link[1]	}	
						});
					}
				});
			});
		});
		return data;
	}

	/**
	 * Return data used for the display of layers' background
	 * @returns a data array with layer background information
	 */
	getDisplayLayers(width, height){
		let data = [];
		let shift = 0;
		this.getLayersInOrder().forEach(dl => {
			if (this.displayedLayers.get(dl).display){
				let layer = this.layers.get(dl);
				if (layer.dims === undefined) this.initLayerNodesPositions(dl,width,height);		
				data.push({
					color: layer.color,
					width: layer.dims.width,
					height: layer.dims.height,
					shift
				});
				shift += layer.dims.height;
			}
		});
		return data;
	}

	/**
	 * 
	 */
	getDisplayNodes(r){
		let data = [];
		let shift = 0;
		this.getLayersInOrder().forEach(dl => {
			let color = this.layers.get(dl).color;
			let dims = this.layers.get(dl).dims;
			// and the position of each node
			[...this.vm.get(dl).entries()].map( ([node,pos]) =>{
				let n = this.nodes.get(node);
				data.push({
					layer: dl,
					r,
					xmin: 0,
					xmax: dims.width,
					ymin: shift,
					ymax: shift+dims.height,
					symbol: n.symbol, 
					x: pos.x, 
					y: shift+pos.y, 
					id: node, 
					color,
					shift
				});
			});
			shift += dims.height;
		},this);
		return data;
	}

	/**
	 * 
	 */
	getLayersInOrder(){
		let l = [...this.layers.entries()].sort((a,b) => a[1].idx-b[1].idx).map(ele => ele[0]);
		// filter the layers based on those that need to be displayed only
		return l.filter(a => this.displayedLayers.get(a).display,this);
	}

	/**
	 * Define all 'group' nodes for a given layer.
	 * Based on the parents for each node in a layer, define groupings that 
	 * condense into a single element all those nodes that share the same parents.
	 * @param {string} layerName the name of the layer to group
	 */
	groupNodesByLayer(layerName){
		let layer = this.vm.get(layerName);
		
		// we will generate a series of new 'grouped' nodes 
		let groupNodes = new Map();
		let newVm = new Map();
		
		[...layer.entries()].forEach(([id,data]) => {
			// retrieve the node and remove it from the list of nodes
			const node = this.nodes.get(id);
			this.nodes.delete(id);
			// generate an id for the new node, based on the layer to witch it belongs
			// and the nodes it is connected to
			let p = parseInt(data.linkedTo.reduce((c,a) => a+c, ''));
			p += TSH(layerName);
			p = -Math.abs(p);
			
			if(!groupNodes.has(p)){
				// add new node
				groupNodes.set(p, { 
					'group': [node], 
					'linkedTo': data.linkedTo,
					'x': data.x,
					'y': data.y
				});				
			}
			else{
				groupNodes.get(p).group.push(node);
			}
		});
		// add grouped nodes to the network's list of nodes
		groupNodes.forEach((v,k) => {
			this.nodes.set(k, {
				id: k, 
				symbol: v.group.length
			});
				
			newVm.set(k, {
				isGroup: true, 
				group: v.group,
				linkedTo: v.linkedTo,
				x: v.x,
				y: v.y
			});
		});
		this.vm.set(layerName, newVm);
	}

	/**
	 * Update the position of the nodes
	 * We will implement a simple grid layout of the nodes, stacking from top to 
	 * bottom the different layers of the network
	 * @param {int} width the width of the drawing panel in pixels
	 * @param {int} height the height of the drawin panel in pixels
	 * @returns the radius (r) of the circle used to represent a node
	 */
	initLayerNodesPositions(layer, width, height, rows, cols){
		// the row index for the current node (the actual shifting in position
		// will be handled based on this index)
		let dx = width/cols;
		let dy = height/rows; 
	
		// actually position the nodes on each layer
		// we set the starting row and column for node positioning
		let x = Math.floor(cols/2); // initial column (at the center)
		let j = 1;
		let y = 0;

		let d = this.layers.get(layer).dims;
	
		// and position the nodes one by one, moving away from the center column
		// and down as the columns get filled
		this.vm.get(layer).forEach((node) => {
			// if the node has already been positioned, we simply update its position 
			// proportionally to its newly defined width/height space
			if(node.x !== undefined ){
				node['x'] = node.x * width / d.width;//cols(dx*(x%cols)) + (dx/2);
				node['y'] = node.y * height / d.height; //(dy*y) + (dy/2);
				
			}
			// otherwise, we initialize its position completely
			else{
				node['x'] = (dx*(x%cols)) + (dx/2);
				node['y'] = (dy*y) + (dy/2);
			}
					
			x += ((-1)**j)*j;
			j += 1;
			if(x >= cols || x < 0){
				x = Math.floor(cols/2);
				y += 1;
				j = 1;
			}
		});
		// update the dimensions of the layer 
		this.layers.get(layer)['dims'] = { width, height: dy*rows, rows, cols };
	}

	initLayersRows(width, height){
		let dsplLay = this.getLayersInOrder();
		// calculate the number of nodes that need to be displayed
		let n = dsplLay.map(dl => this.vm.get(dl).size);
		// determine the number of rows used for the display of each layer
		let layerRows = dsplLay.map(dl => {
			return this.layers.get(dl).dims === undefined ? 1 : this.layers.get(dl).dims.rows;
		},this);
		
		// minimum number of rows is one per display layer
		let totalRows = layerRows.reduce((a,b) => a+b, 0); 
		// minimum number of cols is proportional to the aspect ratio
		let totalCols = Math.ceil(totalRows*width/height); 
		// do the number of nodes of layer i fit in the allocated rows*cols?
		let fits = layerRows.map((r,i) => r*totalCols >= n[i]); 
		// if not... increase the number of rows or cols
		while (fits.includes(false)){
			layerRows = layerRows.map((r,i) => r*totalCols < n[i]? r+1 : r);
			totalRows = layerRows.reduce((a,b) => a+b, 0);
			totalCols = Math.ceil(totalRows*width/height);
			fits = layerRows.map((r,i) => r*totalCols >= n[i]);
		}
		layerRows = layerRows.map((r,i)=> Math.ceil(n[i]/totalCols));
		return [layerRows, totalCols];
	}

	/**
	 * Update the position of the nodes
	 * We will implement a simple grid layout of the nodes, stacking from top to 
	 * bottom the different layers of the network
	 * @param {int} width the width of the drawing panel in pixels
	 * @param {int} height the height of the drawin panel in pixels
	 * @returns the radius (r) of the circle used to represent a node
	 */
	initNodesPositions(width, height){
		let dsplLay = this.getLayersInOrder();
		// determine the number of rows per layer
		let [layerRows, totalCols] = this.initLayersRows(width,height);
		let totalRows = layerRows.reduce((a,b) => a+b, 0);
		
		dsplLay.forEach((dl,i) => {
			// we initialize positions for undefined layers only
			this.initLayerNodesPositions(dl, width, height*layerRows[i]/totalRows, layerRows[i], totalCols);
		},this);
		
		// the row index for the current node (the actual shifting in position
		// will be handled based on this index)
		let bb = Math.min(width/totalCols, height/totalRows); // the bounding box for a node
		let r = bb*.3; // radio of the circle used to represent a node
		return r; 
	}

	/**
	 * 
	 * @param {*} layer 
	 * @param {*} display 
	 */
	setDisplayLayer(layer, display){
		this.displayedLayers.get(layer).display = display;
	}
	
	setNodePosition(id,layer,x,y){
		this.vm.get(layer).get(id).x = x;
		this.vm.get(layer).get(id).y = y;
	}
}

function TSH(s){
	for(var i=0,h=9;i<s.length;){
		h=Math.imul(h^s.charCodeAt(i++),9**9);
	}
	return Math.abs(h^h>>>9);
}