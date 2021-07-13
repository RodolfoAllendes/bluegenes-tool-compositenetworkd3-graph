'use strict';
import { MultiLayerNetwork } from './MultiLayerNetwork';

const d3 = require('d3');

export class CompositeNetworkD3{
	
	/**
	 * constructor
	 * @param {object} model 
	 * @param {object} geneList 
	 */
	constructor(model, geneList, navigate) {
		this.model = model;
		this.geneList = geneList;
		this.navigate = navigate;
		// Initialize the list of nodes from the data retrieved from TargetMine
		this.network = new MultiLayerNetwork();

		// graphical properties of the nodes
		this.r = 15;
		this.nodeMargin = 10;
		this.nodeBB = 50;

		this.width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
		this.height =parseInt(d3.select('#canvas_compositeNetwork').style('height'));
		
		// add hard-coded networks from the initial query
		this.network.addLayer('Gene', 'yellow', 'ellipse', true);
		this.network.addLayer('Compound', 'lime', 'hexagon', false);
		this.network.addLayer('miRNA', 'cyan', 'triangle', false);
		this.network.addLayer('PPI', 'LightGray', 'ellipse', false);

		// add the source gene list to the network
		this.network.parseNodesAndEdges(undefined, geneList, 
			'Gene', 
			'objectId', 
			['primaryIdentifier', 'symbol']
		);

		// add all the nodes and edges found starting from the initial gene list
		geneList.forEach(sourceNode => {
			// add compound interaction - if any available 
			if(sourceNode.proteins !== undefined ){
				this.network.parseNodesAndEdges(sourceNode.objectId, sourceNode.proteins[0].compounds,
					'Compound', 
					'objectId',
					[ ['compound', 'identifier'], ['compound', 'name'] ]
				);
			}
			
			// miRNA interactions
			if(sourceNode.miRNAInteractions !== undefined){
				this.network.parseNodesAndEdges(sourceNode.objectId, sourceNode.miRNAInteractions,
					'miRNA',
					'objectId',
					[ ['miRNA', 'primaryIdentifier'], ['miRNA', 'symbol'] ]
				);
			}

			// PPI interactions
			if(sourceNode.interactions !== undefined){
				this.network.parseNodesAndEdges(sourceNode.objectId, sourceNode.interactions,
					'PPI',
					'objectId',
					[ ['gene2', 'primaryIdentifier'], ['gene2', 'symbol'] ]
				);
			}
		});

		this.initMarkers();
		this.initFunctions();

		this.plot();
	}

	initFunctions(){
		let self = this;
		d3.selectAll('#rightColumn_compositeNetwork input')
			.on('click', function(){ self.setDisplay(this.dataset.layer, this.checked); });
	}

	/**
	 * Add arrow points for drawing of edges
	 */
	initMarkers(){
		d3.select('#canvas_compositeNetwork').append('defs')
			.append('marker')
				.attr('id', 'arrow')
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 5)
				.attr('refY', 0)
				.attr('markerWidth', 4)
				.attr('markerHeight', 4)
				.attr('orient', 'auto')
				.append('path')
					.attr('d', 'M0,-5L10,0L0,5')
					.attr('class','arrowHead');
	}

	plot(){
		let [w,h] = this.network.setNodesPositions(
			parseInt(d3.select('#canvas_compositeNetwork').style('width')),
			parseInt(d3.select('#canvas_compositeNetwork').style('width')), 
			this.nodeBB);
		if(this.width !== w || this.height !== h){
			this.width = w;
			this.height = h;
		}

		/* finally change the viewbox of the svg */
		d3.select('svg')
			.transition()
			.duration(1000)
			.attr('viewBox', '0 0'+
				' '+ this.width + 
				' '+ this.height )
		;
		
		this.plotBackground('#background', this.width);

		// this.plotEdges();
		this.plotNodes('#nodes');

		

	}

	/**
	 * Plot a background to each layer in the graph
	 * @param {} graph 
	 * @param {*} width 
	 */
	plotBackground(graph, width){
		/* filter out only displayable layers */
		let data = [];
		this.network.displayLayers.forEach(dl => {
			data.push(this.network.layers.get(dl));
		},this);
		/* plot a series of layer backgrounds */
		d3.select(graph).selectAll('rect')
			.data(data)
			.join('rect')
				.attr('x', 0)
				.attr('y', d => d.dims.ymin)
				.attr('width', width)
				.attr('height', d => d.dims.ymax - d.dims.ymin)
				.attr('fill', d => d.color)
				.style('opacity', 0.1)
		;
	}

	plotEdges(){
		const edges = [...this.network.edges.values()].map(edge => {
			let s = this.network.nodes.get(edge.source);
			let t = this.network.nodes.get(edge.target);
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

	/**
	 * Plot the nodes in the graph
	 */
	plotNodes(graph){
		let self = this;
		let data = [];
		this.network.displayLayers.forEach(dl=>{
			// fetch the layer's color 
			let color = this.network.layers.get(dl).color;
			// and the position of each node
			[...this.network.vm.get(dl).values()].map(node =>{
				let n = this.network.nodes.get(node);
				data.push({
					layer: dl,
					symbol: n.symbol, 
					x: n.x, 
					y:n.y, 
					id: node, 
					color });
			});
		},this);

		d3.select(graph).selectAll('g').remove();
		// plot the nodes
		let g = d3.select(graph).selectAll('g')
			.data(data)
			.join('g')
			.attr('transform', d => 'translate('+d.x+','+d.y+')');
		
		g.append('circle')
			.attr('r',this.r)
			.attr('fill', d => d.color)
			.attr('stroke', 'black')
			.attr('id', d => d.id)
			// .on('click', (d,i) => {console.log(d,i);})
		;

		g.append('text')
			.text(d => d.symbol)
			.attr('dy', '.35em')
			.style('font-size', function(){ return Math.min(self.r, (1.7 * self.r - 8) / this.getComputedTextLength() * 24)+'px'; })
			.style('text-anchor', 'middle');
			
	}

	/**
	 * 
	 * @param {*} layer 
	 */
	setDisplay(layer, display){
		if(display)
			this.network.displayLayers.add(layer);
		else
			this.network.displayLayers.delete(layer);
		this.plot();
	}

	setInfo(target){
		// target.layer
		d3.select('#nodeSymbol-div > label')
			.text('Symbol: '+target.symbol);
		d3.select('#nodeId-div > label')
			.text('View in TargetMine');
		// .on('click',function(){
		// 	console.log('nav',self.navigate);
		// });
		

	}
}