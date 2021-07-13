'use strict';

export class MultiLayerNetwork{
	constructor(){
		// structural properties for the network
		this.nodes = new Map();
		this.layers = new Map();
		this.vm = new Map();
		this.edges = new Map();

		this.summaryNodes = new Set();
		this.displayLayers = new Set();
	}

	/**
	 * 
	 * @param {string} name 
	 * @param {string} color 
	 * @param {string} shape 
	 * @param {boolean} visible 
	 */
	addLayer(name, color, shape, visible){
		this.layers.set(name, {color, shape});
		if(visible) this.displayLayers.add(name);
	}

	/**
	 * @param {string} source
	 * @param {Array} data 
	 * @param {string} layer 
	 * @param {string} id_attr 
	 * @param {Array} attr 
	 */
	parseNodesAndEdges(source, data, layer, id_attr, attr){
		// retrieve current vm for the layer
		let vm = this.vm.get(layer) || new Set();
		
		data.forEach(ele => {	
			// add nodes to list of nodes
			let cls = typeof attr[0] === 'string' ? ele.class : ele[attr[0][0]].class;
			let id = typeof attr[0] === 'string' ? ele[attr[0]] : ele[attr[0][0]][attr[0][1]];
			let symbol = typeof attr[1] === 'string' ? ele[attr[1]] : ele[attr[1][0]][attr[1][1]];
			this.nodes.set(ele[id_attr], { id, symbol, class: cls });
			
			// add edges only if a source was identified 
			if(source !== undefined){
				this.edges.set(source+'-'+ele[id_attr], {source, target: ele[id_attr]});
			}
			
			// add reference between layer and node
			vm.add(ele[id_attr]);
		}, this);
		this.vm.set(layer, vm); 
	}

	groupNodes(){

	}

	/**
	 * Update the position of the nodes
	 * We will implement a simple grid layout of the nodes, stacking from top to 
	 * bottom the different layers of the network
	 * @param {int} width the width of the drawing panel in pixels
	 * @param {int} height the height of the drawin panel in pixels
	 * @param {int} bb the bounding box size of a node
	 * @returns the pair [width, height] for the viewbox of the svg container
	 */
	setNodesPositions(width, height, bb){
		// calculate the number of nodes that need to be displayed
		let n = 0;
		this.displayLayers.forEach(dl => n += this.vm.get(dl).size);
		
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
			let layer = this.vm.get(dl);
			// we set the starting row and column for node positioning
			let x0 = bb/2;
			let x = Math.floor(cols/2);
			y += 1;
			let j = 1;

			let layerDims = { ymin: y*bb };
			
			// and position the nodes one by one, moving away from the center column
			// and down as the columns get filled
			layer.forEach((node) => {
				let n = this.nodes.get(node);
				n['x'] = x0 + (bb*(x%cols));
				n['y'] = (bb*(y+1))-(bb/2);
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
		});
		// return the updated width/height svg viewBox
		return [cols*bb,(y+1)*bb];
	}
}