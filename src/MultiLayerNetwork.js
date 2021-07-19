'use strict';

export class MultiLayerNetwork{
	constructor(){
		// structural properties for the network
		this.nodes = new Map();
		this.layers = new Map();
		this.vm = new Map();
		this.edges = new Map();

		this.groupedNodes = new Map();
		this.displayLayers = new Set();
		this.groupedLayers = new Set();
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
	 * @param {*} source 
	 * @param {*} layer 
	 * @param {*} data 
	 */
	addNodesAndEdges(source, layer, data){
		// retrieve current vm for the layer
		let vm = this.vm.get(layer) || new Set();
		data.forEach(ele => {
			// add the node to the list (if required)
			let parent = source === undefined ? '' : source.toString();
			if(!this.nodes.has(ele.dbid)){
				this.nodes.set(ele.dbid, {id: ele.id, symbol: ele.symbol, parent});
			}
			else{ // if node is already in the network only update its parents
				if(source !== undefined){
					let node = this.nodes.get(ele.dbid);
					node.parent = node.parent+'-'+parent;
				}
			}
			// add edges only if a source was identified 
			if(source !== undefined)
				this.edges.set(source+'-'+ele.dbid, {source, target: ele.dbid});
			
			// add reference between layer and node
			vm.add(ele.dbid);
		}, this);
		this.vm.set(layer, vm); 
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
			layer.forEach(nid => {
				const node = this.nodes.get(nid);
				if(!nodes.has(node.parent))
					nodes.set(node.parent, { 'group': [nid] });
				else
					nodes.get(node.parent).group.push(nid);
			});
			this.groupedNodes.set(gl, nodes);
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
	setNodesPositions(width, height, bb, groups){
		// calculate the number of nodes that need to be displayed
		let n = 0;
		this.displayLayers.forEach(dl => {
			if(groups && this.groupedLayers.has(dl))
				n += this.groupedNodes.get(dl).size;
			else
				n += this.vm.get(dl).size;
		});
			
		// how many nodes fit the screen horizontally given the pre-defined node 
		// bounding box
		let ar = width/height;
		let cols = Math.floor(width/bb);
		let rows = Math.floor(height/bb);
		while(rows * cols < n){
			cols/rows < ar ? cols+=1 : rows+=1;
		}
		// the row index for the current node (the actual shifting in position
		// will be handled based on this index)
		let y = -1;
		// actually position the nodes on each layer
		this.displayLayers.forEach(dl => {
			// retrieve the list of nodes for the current layer
			let layer = undefined;//this.vm.get(dl);
			// we set the starting row and column for node positioning
			let x0 = bb/2;
			let x = Math.floor(cols/2);
			y += 1;
			let j = 1;

			let layerDims = { ymin: y*bb };

			if(groups && this.groupedLayers.has(dl)){
				layer = this.groupedNodes.get(dl);
			}
			else{
				layer = this.vm.get(dl);
			}
			
			// and position the nodes one by one, moving away from the center column
			// and down as the columns get filled
			layer.forEach((node) => {
				
				if(groups && this.groupedLayers.has(dl)){
					node['x'] = x0 + (bb*(x%cols));
					node['y'] = (bb*(y+1))-(bb/2);
				}
				else{
					let n = this.nodes.get(node);
					n['x'] = x0 + (bb*(x%cols));
					n['y'] = (bb*(y+1))-(bb/2);
				}
					
				x += ((-1)**j)*j;
				j += 1;
				if(x >= cols || x < 0){
					x = Math.floor(cols/2);
					y += 1;
					j = 1;
				}
			});
			// add 'layer bounding box' based on the nodes coordinates
			layerDims['ymax'] = (y+1) * bb;
			this.layers.get(dl)['dims'] = layerDims;
		},this);
		// return the updated width/height svg viewBox
		return [cols*bb,(y+1)*bb];
	}
}