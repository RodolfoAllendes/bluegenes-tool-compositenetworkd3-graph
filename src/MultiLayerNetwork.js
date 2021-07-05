'use strict';

export class MultiLayerNetwork{
	constructor(){
		this.nodes = new Map();
		this.layers = new Map();
		this.vm = new Map();
		this.edges = new Map();
	}

	/**
	 * 
	 * @param {string} name 
	 * @param {string} color 
	 * @param {string} shape 
	 * @param {boolean} visible 
	 */
	addLayer(name, color, shape, visible){
		this.layers.set(name, {color, shape, display: visible});
	}

	/**
	 * 
	 * @param {Array} data 
	 * @param {string} layer 
	 * @param {string} id 
	 * @param {Array} attributes 
	 */
	parseNodes(data, layer, id, attributes){
		// retrieve current vm for the layer
		let vm = this.vm.get(layer) || new Set();
		data.forEach(ele => {
			// add nodes to list of nodes
			this.nodes.set(ele[id], attributes.reduce((acc,cur) => {
				if(typeof cur === 'string')
					return { ...acc, [cur]: ele[cur] };
				else
					return { ...acc, [cur[1]]: ele[cur[0]][cur[1]] };
			}, {}));
			
			// add reference between layer and node
			vm.add(ele[id]);
		}, this);
		this.vm.set(layer, vm); 
	}

	parseEdges(){}
}