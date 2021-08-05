'use strict';

export class MultiLayerNetwork{
	constructor(){
		// structural properties for the network
		this.nodes = new Map();
		this.layers = new Map();
		this.vm = new Map();
		this.edges = new Map();

		// this.groupedLayers = new Set();
		// this.groupedNodes = new Map();
		// this.groupedEdges = new Map();

		this.displayLayers = new Set();
	}

	/**
	 * 
	 * @param {string} name 
	 * @param {string} color 
	 * @param {string} shape 
	 * @param {boolean} visible 
	 * @param {boolean} grouped
	 */
	addLayer(name, color, shape, grouped=true, visible=false){
		this.layers.set(name, {color, shape});
		if(visible) this.displayLayers.add(name);
		if(grouped) this.groupedLayers.add(name);
	}

	/**
	 * 
	 * @param {*} layer 
	 * @param {*} data 
	 */
	addNodes(layer, data){
		// retrieve current vm for the layer
		let vm = this.vm.get(layer) || new Set();
		data.forEach(ele => {
			// add the node to the list (if required)
			if(!this.nodes.has(ele.dbid)){
				let n = {
					id: ele.id, 
					symbol: ele.symbol,
					isGroup: false, 
					...(ele.parent !== undefined && { parents: [ele.parent] } )
				};
				this.nodes.set(ele.dbid, n);
			}
			else{ // if node is already in the network only update its parents
				if(ele.parent !== undefined){
					this.nodes.get(ele.dbid).parents.push(ele.parent);
				}
			}
			// add reference between layer and node
			vm.add(ele.dbid);
		}, this);
		// update the vm element for the layer
		this.vm.set(layer, vm); 
		
	}

	addEdges(layer, data, sourceNode=undefined, sourceLayer=undefined){
		// retrieve current vm for the layer
		let vm = this.vm.get(layer) || new Set();
		let edges = this.edges.get(layer) || new Map();
		data.forEach(ele => {
			// add the node to the list (if required)
			if(!this.nodes.has(ele.dbid)){
				let n = {
					id: ele.id, 
					symbol: ele.symbol, 
					...(sourceNode !== undefined && { parents: [sourceNode.toString()] } )
				};
				this.nodes.set(ele.dbid, n);
			}
			else{ // if node is already in the network only update its parents
				if(sourceNode !== undefined){
					this.nodes.get(ele.dbid).parents.push(sourceNode.toString());
				}
			}
			// add edges only if a source was identified 
			if(sourceNode !== undefined)
				edges.set(sourceNode+'-'+ele.dbid, {
					source: sourceNode, 
					target: ele.dbid,
					sourceLayer,
					targetLayer: layer
				});
			// add reference between layer and node
			vm.add(ele.dbid);
		}, this);
		this.vm.set(layer, vm); 
		this.edges.set(layer, edges);
	

	}

	/**
	 * Define all 'group' nodes for a given layer.
	 * Based on the parents for each node in a layer, define groupings that 
	 * condense into a single element all those nodes that share the same parents.
	 * 
	 * @param {string} layerName the name of the layer to group
	 */
	groupNodesByLayer(layerName){
		let layer = this.vm.get(layerName);
		// we will generate a series of new 'grouped' nodes and edges
		let nodes = new Map();
		// let edges = [];
		let newVm = new Set();
		
		layer.forEach(nid => {
			// retrieve the node and remove it from the list of nodes
			const node = this.nodes.get(nid);
			this.nodes.delete(nid);
			// generate an id for the new node, based on its parents and the layer
			// to witch it belongs
			let p = parseInt(node.parents.reduce((c,a) => a+c, ''));
			p += TSH(layerName);
			p = -Math.abs(p);
			
			if(!nodes.has(p)){
				// add new node
				nodes.set(p, { 'group': [node], 'parents': node.parents });
				// add edges
				// node.parents.forEach(d => {
				// 	this.edges.delete(d+'-'+nid);
				// 	edges.set(d+'-'+p,{
				// 		source: parseInt(d),
				// 		target: p,
				// 		sourceLayer: 'Gene',
				// 		targetLayer: layerName
				// 	});
				// });
				
			}
			else{
				nodes.get(p).group.push(node);
			}
		});

		// add grouped nodes to the network's list of nodes
		nodes.forEach((v,k) => {
			this.nodes.set(k, {
				id: k, 
				symbol: v.group.length,
				isGroup: true, 
				group: v.group,
				parents: v.parents 
			});

			newVm.add(k);
		});
		
		// and the same with the edges
		// edges.forEach(e => {
		// 	this.edges
		// })

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
	setNodesPositions(width, height){
		// calculate the number of nodes that need to be displayed
		let n = [...this.displayLayers.keys()].map(dl => {
			return this.vm.get(dl).size;
		});
		
		// based on the number of nodes to be displayed on each layer, decide the 
		// number of rows and columns the graph should have
		let layerRows = Array(this.displayLayers.size).fill(1);
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
		
		// the row index for the current node (the actual shifting in position
		// will be handled based on this index)
		let dy = height/totalRows; 
		let dx = width/totalCols;
		let bb = Math.min(dx,dy); // the bounding box for a node
		let r = bb*.3; // radio of the circle used to represent a node

		// actually position the nodes on each layer
		let y = 0; // initial row
		this.displayLayers.forEach(dl => {
			// we set the starting row and column for node positioning
			let x = Math.floor(totalCols/2); // initial column (at the center)
			let j = 1;
			let ymin = y*dy;

			// and position the nodes one by one, moving away from the center column
			// and down as the columns get filled
			this.vm.get(dl).forEach((node) => {
				let n = this.nodes.get(node);
				n['x'] = (dx*(x%totalCols)) + (dx/2);
				n['y'] = (dy*y) + (dy/2);
				
				x += ((-1)**j)*j;
				j += 1;
				if(x >= totalCols || x < 0){
					x = Math.floor(totalCols/2);
					y += 1;
					j = 1;
				}
			});
			// add 'layer bounding box' based on the nodes coordinates
			y += 1;
			this.layers.get(dl)['dims'] = { ymin, ymax: y*dy };
		},this);
		// return the updated width/height svg viewBox
		return [r, width, totalRows*dy];
	}
}

function TSH(s){
	for(var i=0,h=9;i<s.length;){
		h=Math.imul(h^s.charCodeAt(i++),9**9);
	}
	return Math.abs(h^h>>>9);
}