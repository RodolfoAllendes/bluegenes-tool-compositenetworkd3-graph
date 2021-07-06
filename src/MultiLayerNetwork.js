'use strict';
const d3 = require('d3');

export class MultiLayerNetwork{
	constructor(){
		// structural properties for the network
		this.nodes = new Map();
		this.layers = new Map();
		this.vm = new Map();
		this.edges = new Map();

		// graphical properties of the nodes
		this.r = 15;
		this.nodeMargin = 10;
		this.nodeBB = 50;
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


	/**
	 * Update the position of the nodes
	 * We will implement a simple grid layout of the nodes, stacking from top to 
	 * bottom the different layers of the network
	 * @param {int} width the width of the drawing panel in pixels
	 * @param {int} height the height of the drawin panel in pixels
	 * @returns the pair [width, height] for the viewbox of the svg container
	 */
	setNodesPositions(width, height){
		let n = this.nodes.size;
		// how many nodes fit the screen horizontally given the pre-defined node 
		// bounding box
		let ar = width/height;
		let cols = Math.floor(width/this.nodeBB);
		let rows = Math.floor(height/this.nodeBB);
		while(rows * cols < n){
			cols/rows < ar ? cols+=1 : rows+=1;
		}
		
		// the row index for the current node (the actual shifting in position
		// will be handled based on this index)
		let y = -1;
		// actually position the nodes on each layer
		this.vm.forEach((layer, id) => {
			// shifting in position along the x axis
			// the number of nodes in the current layer
			n = layer.size;
			let x0 = this.nodeBB / 2;
		
			// console.log('layer,id', layer,id);
			// the column index for the current node
			let x = 0;
			y += 1;
			let layerDims = { ymin: y*this.nodeBB} ;
			// console.log('layer',id,'starts at',y);
			layer.forEach((node) => {
				let n = this.nodes.get(node);
				n['x'] = x0 + (this.nodeBB*(x%cols));
				n['y'] = (this.nodeBB*(y+1))-(this.nodeBB/2);
				x += 1;
				if(x == cols){
					x = 0;
					y += 1;
				}
			});
			// add 'layer bounding box' based on the nodes coordinates
			layerDims['ymax'] = (y+1) * this.nodeBB;
			this.layers.get(id)['dims'] = layerDims;
		});
		// return the updated width/height svg viewBox
		return [cols*this.nodeBB,(y+1)*this.nodeBB];
	}


	plotBackground(graph, width){
		/* plot a series of layer backgrounds */
		d3.select(graph).selectAll('rect')
			.data([...this.layers.values()])
			.enter().append('rect')
				.attr('x', 0)
				.attr('y', d => d.dims.ymin)
				.attr('width', width)
				.attr('height', d => d.dims.ymax - d.dims.ymin)
				.attr('fill', d => d.color)
				.style('opacity', 0.1)
			.exit().remove()
		;
	}

	plotNodes(){
		d3.select('#nodes').selectAll().remove();
		this.vm.forEach((eles,layer) => {
			// fetch node's coordinates
			const nodes = [...eles].map(node => {
				let n = this.nodes.get(node);
				return {x: n.x, y:n.y};
			});
			// console.log(nodes);
			// and layer's color 
			let color = this.layers.get(layer).color;
			d3.select('#nodes').append('g')
				.attr('id', 'layer-'+layer);
			
			// group the nodes within a single layer
			d3.select('#layer-'+layer).selectAll('g')
				.data(nodes)
				.enter().append('g')
					.append('circle')
					.attr('r',this.r)
					.attr('fill', color)
					.attr('stroke', 'black')
					.attr('cx', d => d.x)
					.attr('cy', d => d.y)
					
				.exit().remove()
			;
		});
	}


}