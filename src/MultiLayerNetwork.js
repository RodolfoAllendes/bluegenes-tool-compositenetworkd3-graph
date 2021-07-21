'use strict';

export class MultiLayerNetwork{
	constructor(){
		// structural properties for the network
		this.nodes = new Map();
		this.layers = new Map();
		this.vm = new Map();
		this.edges = new Map();

		this.groupedLayers = new Set();
		this.groupedNodes = new Map();
		this.groupedEdges = new Map();

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
	addLayer(name, color, shape, visible=false, grouped=true){
		this.layers.set(name, {color, shape});
		if(visible) this.displayLayers.add(name);
		if(grouped) this.groupedLayers.add(name);
	}

	/**
	 * 
	 * @param {*} sourceNode 
	 * @param {*} layer 
	 * @param {*} data 
	 */
	addNodesAndEdges(layer, data, sourceNode=undefined, sourceLayer=undefined){
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
	 * Define 'group' nodes.
	 * Based on the parents for each node in a layer, define groupings that 
	 * condense into a single element all those nodes that have share the same
	 * parents.
	 */
	groupNodes(){
		this.groupedLayers.forEach(gl => {
			let layer = this.vm.get(gl);
			let nodes = new Map();
			let edges = new Map();
			layer.forEach(nid => {
				const node = this.nodes.get(nid);
				let p = parseInt(node.parents.reduce((c,a) => a+c, ''));
				if(!nodes.has(p)){
					nodes.set(p, { 'group': [nid] });
					node.parents.forEach(d => {
						edges.set(d+'-'+p,{
							source: parseInt(d),
							target: p,
							sourceLayer: 'Gene',
							targetLayer: gl
						});
					});
				}
				else{
					nodes.get(p).group.push(nid);
				}
			});
			this.groupedNodes.set(gl, nodes);
			this.groupedEdges.set(gl, edges);
		});
	}

	/**
	 * Update the position of the nodes
	 * We will implement a simple grid layout of the nodes, stacking from top to 
	 * bottom the different layers of the network
	 * @param {int} width the width of the drawing panel in pixels
	 * @param {int} height the height of the drawin panel in pixels
	 * @param {int} bb the bounding box size of a node
	 * @param {boolean} groups display groups of nodes
	 * @returns the pair [width, height] for the viewbox of the svg container
	 */
	setNodesPositions(width, height, groups){
		// calculate the number of nodes that need to be displayed
		let n = [...this.displayLayers.keys()].map(dl => {
			if(groups && this.groupedLayers.has(dl))
				return this.groupedNodes.get(dl).size;
			return this.vm.get(dl).size;
		});
		
		// based on the number of nodes to be displayed on each layer, decide the 
		// number of rows and columns the graph should have
		let layerRows = Array(this.displayLayers.size).fill(1);
		let totalRows = layerRows.reduce((a,b) => a+b, 0);
		let totalCols = Math.ceil(totalRows*width/height);
		let fits = layerRows.map((r,i) => r*totalCols >= n[i]);
		while (fits.includes(false)){
			layerRows = layerRows.map((r,i) => r*totalCols < n[i]? r+1 : r);// 		return acc && cur*cols >= n[i]
			totalRows = layerRows.reduce((a,b) => a+b, 0);
			totalCols = Math.ceil(totalRows*width/height);
			fits = layerRows.map((r,i) => r*totalCols >= n[i]);
		}
		layerRows = layerRows.map((r,i)=> Math.ceil(n[i]/totalCols));
		
		// // the row index for the current node (the actual shifting in position
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

			// get a list of nodes or grouped nodes
			let layer = groups && this.groupedLayers.has(dl) ? 
				this.groupedNodes.get(dl) :
				this.vm.get(dl);
			
			// and position the nodes one by one, moving away from the center column
			// and down as the columns get filled
			layer.forEach((node) => {
				let px = (dx*(x%totalCols)) + (dx/2);
				let py = (dy*y) + (dy/2);
				if(groups && this.groupedLayers.has(dl)){
					node['x'] = px;
					node['y'] = py;//(dy*(y+1))-(bb/2);
				}
				else{
					let n = this.nodes.get(node);
					n['x'] = px;
					n['y'] = py;//(dy*(y+1))-(dy/2);
				}
					
				x += ((-1)**j)*j;
				j += 1;
				if(x >= totalCols || x < 0){
					x = Math.floor(totalCols/2);
					y += 1;
					j = 1;
				}
			});
			// add 'layer bounding box' based on the nodes coordinates
			// let layerDims = { ymin: y*bb };layerDims['ymax'] = (y+1) * bb;
			y += 1;
			this.layers.get(dl)['dims'] = { ymin, ymax: y*dy };
		},this);
		// return the updated width/height svg viewBox
		return r; //[totalCols*bb,(y+1)*bb];
	}
}