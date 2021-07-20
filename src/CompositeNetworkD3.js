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
		this.navigate = navigate;
		// Initialize the list of nodes from the data retrieved from TargetMine
		this.network = new MultiLayerNetwork();

		// graphical properties of the nodes
		this.r = 15;
		this.nodeMargin = 10;
		this.nodeBB = 50;

		this._width = parseInt(d3.select('#canvas_compositeNetwork').style('width'));
		this._height =parseInt(d3.select('#canvas_compositeNetwork').style('height'));
		
		// add hard-coded networks from the initial query
		this.network.addLayer('Gene', 'yellow', 'ellipse', true, false);
		this.network.addLayer('Compound', 'lime', 'hexagon', false, true);
		this.network.addLayer('miRNA', 'cyan', 'triangle', false, true);
		// this.network.addLayer('PPI', 'LightGray', 'ellipse', false);

		// add the source gene list to the network
		let genes = geneList.map(g => {
			return {
				dbid: g.objectId,
				id: g.primaryIdentifier,
				symbol: g.symbol
			};
		});
		this.network.addNodesAndEdges('Gene', genes);
		
		// add all the nodes and edges found starting from the initial gene list
		geneList.forEach(sourceNode => {
			
			// add compound interaction - if any available 
			if(sourceNode.proteins !== undefined ){
				let compounds = sourceNode.proteins[0].compounds.map(cpd => {
					return {
						dbid: cpd.objectId,
						id: cpd.identifier,
						symbol: cpd.name
					};
				});
				this.network.addNodesAndEdges('Compound', compounds, sourceNode.objectId, 'Gene');
			}
			
			// miRNA interactions
			if(sourceNode.miRNAInteractions !== undefined){
				let miRNA = sourceNode.miRNAInteractions.map(miR => {
					return {
						dbid: miR.miRNA.objectId,
						id: miR.miRNA.primaryIdentifier,
						symbol: miR.miRNA.symbol
					};
				});
				this.network.addNodesAndEdges('miRNA', miRNA, sourceNode.objectId, 'Gene');
			}

			// PPI interactions
			// if(sourceNode.interactions !== undefined){
			// 	this.network.parseNodesAndEdges(sourceNode.objectId, sourceNode.interactions,
			// 		'PPI',
			// 		'objectId',
			// 		[ ['gene2', 'primaryIdentifier'], ['gene2', 'symbol'] ]
			// 	);
			// }
		});
		this.network.groupNodes();

		this.initMarkers();
		this.initFunctions();
		this.plot();

		window.addEventListener('resize', () => {this.plot();});
	}

	initFunctions(){
		let self = this;
		d3.selectAll('#rightColumn_compositeNetwork input.displayCB')
			.on('change', function(){ self.setDisplay(this.dataset.layer, this.checked); });

		d3.selectAll('#rightColumn_compositeNetwork input.nodeCB')
			.on('change', function(){ self.plot(); });
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
			this.nodeBB,
			d3.select('#cb-nodeGroup').property('checked'));
		if(this._width !== w || this._height !== h){
			this._width = w;
			this._height = h;
		}

		/* finally change the viewbox of the svg */
		d3.select('svg')
			.transition()
			.duration(1000)
			.attr('viewBox', '0 0'+
				' '+ this._width + 
				' '+ this._height )
		;
		
		this.plotBackground('#background', this._width);

		this.plotEdges('#edges', d3.select('#cb-nodeGroup').property('checked'));
		this.plotNodes('#nodes', d3.select('#cb-nodeGroup').property('checked'));
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

	/**
	 * Plot the edges in the graph
	 * @param {} graph
	 * @param {boolean} groups display groups of nodes
	 */
	plotEdges(graph, groups){
		let data = [];

		if(this.network.displayLayers.size >= 2){
			this.network.displayLayers.forEach(dl => {
				if(groups && this.network.groupedLayers.has(dl)){
					this.network.groupedEdges.get(dl).forEach(edge => {
						if(this.network.displayLayers.has(edge.sourceLayer)){
							let s = this.network.nodes.get(edge.source);
							let t = this.network.groupedNodes.get(dl).get(edge.target);
							data.push({
								source: [s.x, s.y],
								target: [t.x, t.y]
							});
						}
					});
				}
				else{
					this.network.edges.get(dl).forEach(edge => {
						let s = this.network.nodes.get(edge.source);
						let t = this.network.nodes.get(edge.target);
						data.push({ 
							source: [s.x, s.y+this.r], 
							target: [t.x, t.y-this.r-2] 
						});
					});
				}
			});
		}

		// d3.select(graph).selectAll('path')
		// 	.data(data)
		// 	.join('path')
		// 		.attr('class', 'arrow')
		// 		.attr('marker-end', 'url(#arrow)')
		// 		.attr('d', d3.linkVertical()
		// 			.source(d => d.source)
		// 			.target(d => d.target)
		// 		)
		// 		.attr('stroke', 'black')
		// 		.style('opacity', 0.2);

		d3.select(graph).selectAll('line')
			.data(data)
			.join('line')
				.attr('x1', d => d.source[0])
				.attr('x2', d => d.target[0])
				.attr('y1', d => d.source[1])
				.attr('y2', d => d.target[1])
				.attr('stroke', 'black')
				.style('opacity', 0.2);
	}

	/**
	 * Plot the nodes in the graph
	 * @param {} graph
	 * @param {boolean} groups display groups of nodes
	 */
	plotNodes(graph, groups){
		let self = this;
		let data = [];
		this.network.displayLayers.forEach(dl=>{
			// fetch the layer's color 
			let color = this.network.layers.get(dl).color;
			// and the position of each node
			if(groups && this.network.groupedLayers.has(dl)){
				[...this.network.groupedNodes.get(dl).values()].map(node =>{
					data.push({
						layer:dl,
						symbol: node.group.length,
						x: node.x,
						y: node.y,
						id: node,
						color
					});
				});
			}
			else{
				[...this.network.vm.get(dl).values()].map(node =>{
					let n = this.network.nodes.get(node);
					data.push({
						layer: dl,
						symbol: n.symbol, 
						x: n.x, 
						y: n.y, 
						id: node, 
						color 
					});
				});
			}
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