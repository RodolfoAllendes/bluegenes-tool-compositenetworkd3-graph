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
			let id = typeof attr[0] === 'string' ? ele[attr[0]] : ele[attr[0][0]][attr[0][1]];
			let symbol = typeof attr[1] === 'string' ? ele[attr[1]] : ele[attr[1][0]][attr[1][1]];
			this.nodes.set(ele[id_attr], { id, symbol });
			
			// add edges only if a source was identified 
			if(source !== undefined){
				this.edges.set(source+'-'+ele[id_attr], {source, target: ele[id_attr]});
			}
			
			// add reference between layer and node
			vm.add(ele[id_attr]);
		}, this);
		this.vm.set(layer, vm); 
	}

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

	plotEdges(){
		const edges = [...this.edges.values()].map(edge => {
			let s = this.nodes.get(edge.source);
			let t = this.nodes.get(edge.target);
			return { source: [s.x, s.y+this.r], target: [t.x, t.y-this.r-2]  };
		});
		

		d3.select('#edges').selectAll('path')
			.data(edges)
			.enter().append('path')
				.attr('class', 'arrow')
				.attr('marker-end', 'url(#arrow)')
				// .attr('x1',d => d.sx)
				// .attr('x2',d => d.tx)
				// .attr('y1',d => d.sy)
				// .attr('y2',d => d.ty)
				.attr('d', d3.linkVertical()
					.source(d => d.source)
					.target(d => d.target)
				)
				.attr('stroke', 'black')
				.style('opacity', 0.2)
			.exit().remove();
	}

	plotNodes(){
		let self = this;
		d3.select('#nodes').selectAll().remove();
		this.vm.forEach((eles,layer) => {
			// fetch node's coordinates
			const nodes = [...eles].map(node => {
				let n = this.nodes.get(node);
				return {x: n.x, y:n.y, id: node};
			});
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
					.attr('id', d => d.id)
					.on('click', function(){
						let node = self.nodes.get(parseInt(this.id));
						window.alert(node.id, node.symbol);
					})
					
				.exit().remove()
			;
		});
	}


}